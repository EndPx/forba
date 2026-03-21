'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import { GitBranch, Code, Search, PenTool, ChevronDown, ChevronRight, DollarSign, ExternalLink } from 'lucide-react';

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

const TYPE_ICONS: Record<string, typeof Code> = {
  code: Code,
  research: Search,
  copy: PenTool,
};

export function TaskFlow({ taskId, events }: { taskId: string | null; events: Array<{ type: string; taskId?: string }> }) {
  const [task, setTask] = useState<TaskDetailData | null>(null);
  const [expandedSubtask, setExpandedSubtask] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) return;

    const fetchTask = async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`);
        const data = await res.json();
        setTask(data);
      } catch (error) {
        console.error('Failed to fetch task:', error);
      }
    };

    fetchTask();
    // Refetch on relevant events
    const relevantEvent = events.find(
      (e) => e.taskId === taskId
    );
    if (relevantEvent) {
      fetchTask();
    }
  }, [taskId, events]);

  if (!task) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4 text-violet-500" />
            Task Flow
          </CardTitle>
          <StatusBadge status={task.status} />
        </div>
        <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {task.subtasks.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            Decomposing task into subtasks...
          </div>
        )}

        {task.subtasks.map((subtask) => {
          const Icon = TYPE_ICONS[subtask.type] || Code;
          const isExpanded = expandedSubtask === subtask.id;

          return (
            <div key={subtask.id} className="border rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left"
                onClick={() => setExpandedSubtask(isExpanded ? null : subtask.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="h-8 w-8 rounded-md bg-violet-100 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{subtask.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{subtask.type}</span>
                    {subtask.assignedAgent && (
                      <span className="text-xs text-violet-600">
                        → {subtask.assignedAgent.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {subtask.escrow && (
                    <span className="text-xs font-mono text-muted-foreground">
                      {subtask.escrow.amount} USDC
                    </span>
                  )}
                  <StatusBadge status={subtask.status} />
                </div>
              </button>

              {isExpanded && (
                <div className="border-t px-3 py-3 bg-muted/30 space-y-2">
                  {subtask.evaluationReason && (
                    <div className="text-xs">
                      <span className="font-medium">Evaluation:</span>{' '}
                      <span className="text-muted-foreground">{subtask.evaluationReason}</span>
                    </div>
                  )}
                  {subtask.escrow?.releaseTxHash && (
                    <div className="text-xs flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <span className="font-medium">Tx:</span>{' '}
                      <a
                        href={`https://basescan.org/tx/${subtask.escrow.releaseTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-600 hover:underline flex items-center gap-1"
                      >
                        {subtask.escrow.releaseTxHash.substring(0, 10)}...
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {subtask.deliverable && (
                    <details className="text-xs">
                      <summary className="cursor-pointer font-medium">View Deliverable</summary>
                      <pre className="mt-2 p-2 bg-background rounded border text-xs overflow-auto max-h-[200px] whitespace-pre-wrap">
                        {subtask.deliverable}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {task.finalResult && (
          <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Final Result</h4>
            <pre className="p-3 bg-muted rounded-lg text-xs overflow-auto max-h-[300px] whitespace-pre-wrap">
              {task.finalResult}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
