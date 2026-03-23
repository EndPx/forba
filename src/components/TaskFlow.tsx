'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import { ChevronDown, ChevronRight, ExternalLink, Loader2 } from 'lucide-react';

interface SubtaskData {
  id: string;
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
    releaseTxHash?: string;
  } | null;
}

interface TaskDetailData {
  id: string;
  description: string;
  status: string;
  subtasks: SubtaskData[];
  finalResult?: string;
  createdAt: string;
  completedAt?: string;
}

function getCompletedCount(subtasks: SubtaskData[]) {
  return subtasks.filter((s) =>
    ['completed', 'approved', 'delivered', 'released'].includes(s.status)
  ).length;
}

const STATUS_LABEL: Record<string, string> = {
  pending:     'Pending',
  assigned:    'Assigned',
  in_progress: 'In progress',
  working:     'Working',
  delivered:   'Delivered',
  approved:    'Approved',
  completed:   'Done',
  failed:      'Failed',
  rejected:    'Rejected',
};

const STATUS_TEXT: Record<string, string> = {
  pending:     'text-zinc-400',
  assigned:    'text-blue-500',
  in_progress: 'text-amber-500',
  working:     'text-amber-500',
  delivered:   'text-zinc-500',
  approved:    'text-green-600',
  completed:   'text-green-600',
  failed:      'text-red-500',
  rejected:    'text-red-500',
};

const isActive = (status: string) => ['assigned', 'in_progress', 'working'].includes(status);

export function TaskFlow({ taskId, initialData }: { taskId: string | null; events?: Array<{ type: string; taskId?: string }>; initialData?: Record<string, unknown> | null }) {
  const [task, setTask] = useState<TaskDetailData | null>(null);
  const [expandedSubtask, setExpandedSubtask] = useState<string | null>(null);

  // Use initialData from POST response (avoids Vercel stateless GET 404)
  useEffect(() => {
    if (initialData && initialData.id === taskId) {
      setTask(initialData as unknown as TaskDetailData);
    }
  }, [initialData, taskId]);

  useEffect(() => {
    if (!taskId) return;
    // Skip fetch if we already have data from initialData
    if (task && task.id === taskId) return;
    const fetchTask = async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`);
        if (!res.ok) return; // Don't set error response as task data
        const data = await res.json();
        if (data && data.subtasks) setTask(data);
      } catch (error) {
        console.error('Failed to fetch task:', error);
      }
    };
    fetchTask();
  }, [taskId, task]);

  if (!taskId) return null;

  if (!task) {
    return (
      <Card className="border-zinc-200">
        <CardContent className="py-10 flex items-center justify-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading task…
        </CardContent>
      </Card>
    );
  }

  const subtasks = task.subtasks || [];
  const completedCount = getCompletedCount(subtasks);
  const totalCount = subtasks.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Card className="border-zinc-200 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm font-semibold text-zinc-900">Task Flow</CardTitle>
          <StatusBadge status={task.status} />
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 mt-1">
          {task.description}
        </p>

        {totalCount > 0 && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Progress</span>
              <span className="font-mono">{completedCount}/{totalCount}</span>
            </div>
            <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-800 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-0">
        {subtasks.length === 0 && (
          <div className="py-8 flex flex-col items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
            <p className="text-xs text-zinc-400">Decomposing task into subtasks…</p>
          </div>
        )}

        {subtasks.map((subtask, index) => {
          const expanded = expandedSubtask === subtask.id;
          const active = isActive(subtask.status);
          const statusLabel = STATUS_LABEL[subtask.status] || subtask.status;
          const statusText = STATUS_TEXT[subtask.status] || 'text-zinc-400';
          const isLast = index === subtasks.length - 1;

          return (
            <div key={subtask.id} className="relative">
              {!isLast && (
                <div className="absolute left-[7px] top-[28px] w-px h-[calc(100%-8px)] bg-zinc-100" />
              )}

              <div className="relative mt-1">
                <button
                  className={`w-full flex items-start gap-3 p-2.5 rounded-md text-left transition-colors ${
                    expanded ? 'bg-zinc-50' : 'hover:bg-zinc-50'
                  }`}
                  onClick={() => setExpandedSubtask(expanded ? null : subtask.id)}
                >
                  {/* Status dot */}
                  <div className="mt-1 shrink-0">
                    <div className={`h-3.5 w-3.5 rounded-full border-2 border-white ring-1 ${
                      subtask.status === 'completed' || subtask.status === 'approved'
                        ? 'bg-green-500 ring-green-300'
                        : subtask.status === 'failed' || subtask.status === 'rejected'
                        ? 'bg-red-400 ring-red-200'
                        : active
                        ? 'bg-amber-400 ring-amber-200'
                        : 'bg-zinc-200 ring-zinc-200'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-zinc-700 leading-snug">{subtask.description}</p>
                      {expanded
                        ? <ChevronDown className="h-3 w-3 text-zinc-300 shrink-0 mt-0.5" />
                        : <ChevronRight className="h-3 w-3 text-zinc-300 shrink-0 mt-0.5" />
                      }
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs font-medium ${statusText}`}>
                        {active && <Loader2 className="h-2.5 w-2.5 animate-spin inline mr-1" />}
                        {statusLabel}
                      </span>
                      {subtask.assignedAgent && (
                        <span className="text-xs text-zinc-400">{subtask.assignedAgent.name}</span>
                      )}
                      {subtask.escrow && (
                        <span className="text-xs font-mono text-zinc-500">
                          ${subtask.escrow.amount.toFixed(2)} USDC
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div className="ml-6 mb-2 border border-zinc-100 rounded-md bg-white divide-y divide-zinc-50 overflow-hidden">
                    {subtask.evaluationReason && (
                      <div className="px-3 py-2 text-xs text-zinc-500">
                        <span className="font-medium text-zinc-700">Evaluation: </span>
                        {subtask.evaluationReason}
                      </div>
                    )}
                    {subtask.escrow?.releaseTxHash && (
                      <div className="px-3 py-2 flex items-center justify-between">
                        <span className="text-xs text-green-600 font-medium">Payment released</span>
                        <a
                          href={`https://sepolia.basescan.org/tx/${subtask.escrow.releaseTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-zinc-700 transition-colors"
                        >
                          {subtask.escrow.releaseTxHash.substring(0, 10)}…
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {subtask.deliverable && (
                      <details className="px-3 py-2">
                        <summary className="text-xs font-medium text-zinc-600 cursor-pointer hover:text-zinc-900 select-none">
                          View deliverable
                        </summary>
                        <pre className="mt-2 p-2.5 bg-zinc-950 text-zinc-300 rounded text-xs overflow-auto max-h-[200px] whitespace-pre-wrap font-mono leading-relaxed">
                          {subtask.deliverable}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {task.finalResult && (
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <p className="text-xs font-semibold text-zinc-700 mb-2">Final Result</p>
            <pre className="p-3 bg-zinc-950 text-zinc-300 rounded text-xs overflow-auto max-h-[280px] whitespace-pre-wrap font-mono leading-relaxed">
              {task.finalResult}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
