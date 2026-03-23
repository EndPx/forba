'use client';

import { useState, useEffect } from 'react';
import { TaskForm } from '@/components/TaskForm';
import { TaskFlow } from '@/components/TaskFlow';
import { LiveFeed } from '@/components/LiveFeed';
import { PaymentLog } from '@/components/PaymentLog';
import { useSSE } from '@/hooks/useSSE';
import { useTasks } from '@/hooks/useTask';
import { StatusBadge } from '@/components/StatusBadge';

export default function DashboardPage() {
  const { events, connected } = useSSE();
  const { tasks, fetchTasks, createTask } = useTasks();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('forba_active_task') || null;
    }
    return null;
  });
  const [cachedTaskData, setCachedTaskData] = useState<Record<string, unknown> | null>(null);

  // Persist active task ID
  useEffect(() => {
    if (activeTaskId) {
      localStorage.setItem('forba_active_task', activeTaskId);
    }
  }, [activeTaskId]);
  const [agentCount, setAgentCount] = useState<number | string>('—');

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const taskCreatedEvent = events.find((e) => e.type === 'task:created');
    if (taskCreatedEvent?.taskId) {
      setActiveTaskId(taskCreatedEvent.taskId);
    }
  }, [events]);

  useEffect(() => {
    fetch('/api/agents')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAgentCount(data.length); })
      .catch(() => {});
  }, []);

  const handleSubmit = async (description: string) => {
    const result = await createTask(description);
    if (result?.taskId) {
      setActiveTaskId(result.taskId);
      if (result.task) setCachedTaskData(result.task);
    }
  };

  const completedTasks  = tasks.filter((t) => t.status === 'completed' || t.status === 'approved').length;
  const activeTasks     = tasks.filter((t) => !['completed', 'approved', 'failed'].includes(t.status ?? '')).length;
  const totalSubtasks   = tasks.reduce((s, t) => s + (t.subtaskCount ?? 0), 0);
  const completedSubs   = tasks.reduce((s, t) => s + (t.completedSubtasks ?? 0), 0);
  const successRate     = totalSubtasks > 0 ? Math.round((completedSubs / totalSubtasks) * 100) : 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-6xl">

      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Dispatch tasks — agents handle the rest, on-chain.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Tasks',  value: tasks.length,  sub: `${completedTasks} completed` },
          { label: 'Active',       value: activeTasks,   sub: activeTasks > 0 ? 'In progress' : 'All idle' },
          { label: 'Agents',       value: agentCount,    sub: 'In marketplace' },
          { label: 'Success Rate', value: `${successRate}%`, sub: `${completedSubs}/${totalSubtasks} subtasks` },
        ].map((stat) => (
          <div key={stat.label} className="border border-zinc-200 rounded-lg bg-white p-4">
            <p className="text-2xl font-semibold text-zinc-900 tabular-nums">{stat.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{stat.label}</p>
            <p className="text-xs text-zinc-300 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Task form */}
      <TaskForm onSubmit={handleSubmit} />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <TaskFlow taskId={activeTaskId} events={events} initialData={cachedTaskData} />
          <PaymentLog />
        </div>
        <LiveFeed events={events} connected={connected} />
      </div>

      {/* Task history */}
      {tasks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 mb-3">
            Task History
            <span className="ml-2 text-xs font-mono text-zinc-400 font-normal">{tasks.length}</span>
          </h3>
          <div className="space-y-1">
            {tasks.map((task) => {
              const isActive = activeTaskId === task.id;
              const pct = task.subtaskCount > 0
                ? Math.round((task.completedSubtasks / task.subtaskCount) * 100)
                : 0;

              return (
                <button
                  key={task.id}
                  onClick={() => setActiveTaskId(task.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-md border transition-colors ${
                    isActive
                      ? 'border-zinc-300 bg-zinc-50'
                      : 'border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-zinc-700 truncate flex-1 leading-snug">
                      {task.description}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-zinc-400 font-mono">
                        {task.completedSubtasks}/{task.subtaskCount}
                      </span>
                      {task.status && <StatusBadge status={task.status} />}
                    </div>
                  </div>
                  {task.subtaskCount > 0 && (
                    <div className="mt-2 h-0.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
