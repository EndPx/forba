'use client';

import { useState, useEffect } from 'react';
import { TaskForm } from '@/components/TaskForm';
import { TaskFlow } from '@/components/TaskFlow';
import { LiveFeed } from '@/components/LiveFeed';
import { PaymentLog } from '@/components/PaymentLog';
import { useSSE } from '@/hooks/useSSE';
import { useTasks } from '@/hooks/useTask';

export default function DashboardPage() {
  const { events, connected } = useSSE();
  const { tasks, fetchTasks, createTask } = useTasks();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Auto-select the latest task when a new one is created
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

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <TaskForm onSubmit={handleSubmit} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <TaskFlow taskId={activeTaskId} events={events} />
          <PaymentLog />
        </div>
        <LiveFeed events={events} connected={connected} />
      </div>

      {/* Task History */}
      {tasks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 text-muted-foreground">Task History</h3>
          <div className="space-y-2">
            {tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => setActiveTaskId(task.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  activeTaskId === task.id
                    ? 'border-violet-300 bg-violet-50'
                    : 'hover:border-violet-200 hover:bg-violet-50/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm truncate flex-1">{task.description}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {task.completedSubtasks}/{task.subtaskCount} subtasks
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
