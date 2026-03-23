'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  getStoredTasks,
  getStoredTask,
  saveTask,
  saveEscrows,
  type StoredTask,
  type StoredEscrow,
} from '@/lib/storage/local';

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
      // Try server first
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setTasks(data);
      } else {
        // Server has nothing — use localStorage
        const stored = getStoredTasks();
        setTasks(stored.map(taskToSummary));
      }
    } catch {
      // Network error — use localStorage
      const stored = getStoredTasks();
      setTasks(stored.map(taskToSummary));
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = useCallback(async (description: string) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();

      // Save full task data to localStorage
      if (data?.task) {
        saveTask(data.task as StoredTask);

        // Extract escrows from subtasks and save them
        const escrows: StoredEscrow[] = [];
        for (const st of data.task.subtasks || []) {
          if (st.escrow) {
            escrows.push({
              id: st.escrow.id,
              taskId: data.task.id,
              subtaskId: st.id,
              clientAgentId: '',
              providerAgentId: st.assignedAgent?.id || '',
              amount: st.escrow.amount,
              status: st.escrow.status,
              fundTxHash: st.escrow.fundTxHash,
              releaseTxHash: st.escrow.releaseTxHash,
              createdAt: data.task.createdAt,
              releasedAt: data.task.completedAt,
            });
          }
        }
        if (escrows.length > 0) saveEscrows(escrows);

        // Update local state
        const stored = getStoredTasks();
        setTasks(stored.map(taskToSummary));
      }

      return data;
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  }, []);

  return { tasks, loading, fetchTasks, createTask };
}

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
      // Server doesn't have it — try localStorage
      const stored = getStoredTask(taskId);
      if (stored) setTask(stored as TaskDetail);
    } catch {
      // Network error — try localStorage
      const stored = getStoredTask(taskId);
      if (stored) setTask(stored as TaskDetail);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  return { task, loading, fetchTask };
}
