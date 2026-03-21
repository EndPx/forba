'use client';

import { useState, useCallback } from 'react';

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

export function useTasks() {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
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
      await fetchTasks();
      return data;
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  }, [fetchTasks]);

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
      const data = await res.json();
      setTask(data);
    } catch (error) {
      console.error('Failed to fetch task:', error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  return { task, loading, fetchTask };
}
