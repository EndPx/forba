'use client';

import { useState, useEffect } from 'react';
import { TaskForm } from '@/components/TaskForm';
import { TaskFlow } from '@/components/TaskFlow';
import { LiveFeed } from '@/components/LiveFeed';
import { PaymentLog } from '@/components/PaymentLog';
import { useSSE } from '@/hooks/useSSE';
import { useTasks } from '@/hooks/useTask';
import { StatusBadge } from '@/components/StatusBadge';
import {
  LayoutDashboard, CheckCircle2, Users, TrendingUp,
  Clock, Sparkles
} from 'lucide-react';

export default function DashboardPage() {
  const { events, connected } = useSSE();
  const { tasks, fetchTasks, createTask } = useTasks();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const taskCreatedEvent = events.find((e) => e.type === 'task:created');
    if (taskCreatedEvent?.taskId) {
      setActiveTaskId(taskCreatedEvent.taskId);
    }
  }, [events]);

  const handleSubmit = async (description: string) => {
    const result = await createTask(description);
    if (result?.taskId) {
      setActiveTaskId(result.taskId);
    }
  };

  // Derived stats
  const completedTasks = tasks.filter((t) => t.status === 'completed' || t.status === 'approved').length;
  const activeTasks = tasks.filter((t) => !['completed', 'approved', 'failed'].includes(t.status ?? '')).length;
  const totalSubtasks = tasks.reduce((s, t) => s + (t.subtaskCount ?? 0), 0);
  const completedSubtasks = tasks.reduce((s, t) => s + (t.completedSubtasks ?? 0), 0);
  const successRate = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const STATS = [
    {
      label: 'Total Tasks',
      value: tasks.length,
      icon: LayoutDashboard,
      gradient: 'from-violet-500 to-violet-400',
      bg: 'bg-violet-50',
      text: 'text-violet-700',
      border: 'border-violet-100',
      sub: `${completedTasks} completed`,
    },
    {
      label: 'Active Tasks',
      value: activeTasks,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-400',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-100',
      sub: activeTasks > 0 ? 'In progress now' : 'All idle',
    },
    {
      label: 'Total Agents',
      value: '—',
      icon: Users,
      gradient: 'from-blue-500 to-cyan-400',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-100',
      sub: 'Across marketplace',
    },
    {
      label: 'Success Rate',
      value: `${successRate}%`,
      icon: TrendingUp,
      gradient: 'from-green-500 to-emerald-400',
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-100',
      sub: `${completedSubtasks}/${totalSubtasks} subtasks`,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-orange-500 flex items-center justify-center shadow-sm">
          <Sparkles className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Command Center</h1>
          <p className="text-xs text-muted-foreground">Dispatch tasks — agents handle the rest, on-chain.</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`rounded-2xl border ${stat.border} ${stat.bg} p-4 flex items-center gap-3`}
            >
              <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-sm shrink-0`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className={`text-xl font-bold tabular-nums ${stat.text}`}>{stat.value}</p>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide leading-none mt-0.5">{stat.label}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{stat.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task form */}
      <TaskForm onSubmit={handleSubmit} />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <TaskFlow taskId={activeTaskId} events={events} />
          <PaymentLog />
        </div>
        <LiveFeed events={events} connected={connected} />
      </div>

      {/* Task history */}
      {tasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-semibold text-foreground">Task History</h3>
            <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full font-mono">{tasks.length}</span>
          </div>
          <div className="space-y-2">
            {tasks.map((task) => {
              const isActive = activeTaskId === task.id;
              const pct = task.subtaskCount > 0
                ? Math.round((task.completedSubtasks / task.subtaskCount) * 100)
                : 0;

              return (
                <button
                  key={task.id}
                  onClick={() => setActiveTaskId(task.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 ${
                    isActive
                      ? 'border-violet-300 bg-violet-50/80 shadow-sm shadow-violet-100'
                      : 'border-slate-200 hover:border-violet-200 hover:bg-violet-50/30 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm text-foreground truncate flex-1 leading-snug">{task.description}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {task.completedSubtasks}/{task.subtaskCount}
                      </span>
                      {task.status && <StatusBadge status={task.status} />}
                    </div>
                  </div>
                  {task.subtaskCount > 0 && (
                    <div className="mt-2 h-1 bg-violet-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-orange-400 rounded-full transition-all duration-500"
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
