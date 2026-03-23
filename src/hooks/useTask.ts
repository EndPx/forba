'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getStoredTasks,
  getStoredTask,
  saveTask,
  saveEscrows,
  type StoredTask,
  type StoredEscrow,
} from '@/lib/storage/local';

// ── Types ───────────────────────────────────────────────────────────────────

interface TaskSummary {
  id: string;
  description: string;
  status: string;
  subtaskCount: number;
  completedSubtasks: number;
  createdAt: string;
  completedAt?: string;
}

interface TaskDetail {
  id: string;
  description: string;
  status: string;
  subtasks: Array<{
    id: string;
    taskId: string;
    description: string;
    type: string;
    status: string;
    assignedAgent?: { id: string; name: string; type: string } | null;
    deliverable?: string;
    evaluationReason?: string;
    escrow?: {
      id: string;
      amount: number;
      status: string;
      fundTxHash?: string;
      releaseTxHash?: string;
    } | null;
  }>;
  finalResult?: string;
  createdAt: string;
  completedAt?: string;
}

export interface StreamProgress {
  type: 'progress' | 'result';
  event?: string;
  taskId: string;
  subtaskId?: string;
  agentId?: string;
  message?: string;
  data?: Record<string, unknown>;
  timestamp?: string;
  status?: string;
  task?: TaskDetail;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function taskToSummary(t: StoredTask): TaskSummary {
  const completedStatuses = ['completed', 'approved', 'delivered', 'released'];
  return {
    id: t.id,
    description: t.description,
    status: t.status,
    subtaskCount: t.subtasks?.length ?? 0,
    completedSubtasks: t.subtasks?.filter((s) => completedStatuses.includes(s.status)).length ?? 0,
    createdAt: t.createdAt,
    completedAt: t.completedAt,
  };
}

// ── useTasks ────────────────────────────────────────────────────────────────

export function useTasks() {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = getStoredTasks();
    if (stored.length > 0) {
      setTasks(stored.map(taskToSummary));
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setTasks(data);
      } else {
        const stored = getStoredTasks();
        setTasks(stored.map(taskToSummary));
      }
    } catch {
      const stored = getStoredTasks();
      setTasks(stored.map(taskToSummary));
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = useCallback(async (
    description: string,
    onProgress?: (event: StreamProgress) => void,
  ) => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || 'Failed to create task');
    }

    // Read NDJSON stream for progress
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response stream');

    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult: StreamProgress | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as StreamProgress;
            if (event.type === 'result') {
              finalResult = event;
            }
            onProgress?.(event);
          } catch {
            // Skip malformed lines
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer) as StreamProgress;
          if (event.type === 'result') finalResult = event;
          onProgress?.(event);
        } catch {
          // Skip
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Save final result to localStorage
    if (finalResult?.task) {
      saveTask(finalResult.task as unknown as StoredTask);

      // Extract escrows
      const escrows: StoredEscrow[] = [];
      for (const st of finalResult.task.subtasks || []) {
        if (st.escrow) {
          escrows.push({
            id: st.escrow.id,
            taskId: finalResult.task.id,
            subtaskId: st.id,
            clientAgentId: '',
            providerAgentId: st.assignedAgent?.id || '',
            amount: st.escrow.amount,
            status: st.escrow.status,
            fundTxHash: st.escrow.fundTxHash,
            releaseTxHash: st.escrow.releaseTxHash,
            createdAt: finalResult.task.createdAt,
            releasedAt: finalResult.task.completedAt,
          });
        }
      }
      if (escrows.length > 0) saveEscrows(escrows);

      // Update tasks list
      const stored = getStoredTasks();
      setTasks(stored.map(taskToSummary));
    }

    return finalResult;
  }, []);

  return { tasks, loading, fetchTasks, createTask };
}

// ── useTaskDetail ───────────────────────────────────────────────────────────

export function useTaskDetail(taskId: string | null) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTask = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.subtasks) {
          setTask(data);
          return;
        }
      }
      const stored = getStoredTask(taskId);
      if (stored) setTask(stored as TaskDetail);
    } catch {
      const stored = getStoredTask(taskId);
      if (stored) setTask(stored as TaskDetail);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  return { task, loading, fetchTask, setTask };
}

// ── useTaskStream (manages streaming progress for active task) ──────────

export function useTaskStream() {
  const [progress, setProgress] = useState<StreamProgress[]>([]);
  const [phase, setPhase] = useState<string>('idle'); // idle | creating | decomposing | hiring | executing | evaluating | compiling | done | failed
  const [isStreaming, setIsStreaming] = useState(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const clearProgress = useCallback(() => {
    setProgress([]);
    setPhase('idle');
  }, []);

  const handleProgress = useCallback((event: StreamProgress) => {
    setProgress((prev) => [...prev, event]);

    if (event.type === 'progress') {
      // Map event types to phases
      switch (event.event) {
        case 'task:created':
          setPhase('creating');
          break;
        case 'task:decomposed':
          setPhase('hiring');
          break;
        case 'agent:hired':
          setPhase('hiring');
          break;
        case 'escrow:created':
          setPhase('executing');
          break;
        case 'evaluation:started':
          setPhase('evaluating');
          break;
        case 'evaluation:passed':
        case 'evaluation:failed':
          setPhase('evaluating');
          break;
        case 'escrow:released':
        case 'escrow:refunded':
          setPhase('compiling');
          break;
        case 'task:completed':
          setPhase('done');
          break;
        case 'task:failed':
          setPhase('failed');
          break;
      }
    } else if (event.type === 'result') {
      setPhase(event.status === 'completed' ? 'done' : 'failed');
      setIsStreaming(false);
    }
  }, []);

  const startStream = useCallback(() => {
    setProgress([]);
    setPhase('creating');
    setIsStreaming(true);
  }, []);

  return {
    progress,
    phase,
    isStreaming,
    handleProgress,
    startStream,
    clearProgress,
  };
}
