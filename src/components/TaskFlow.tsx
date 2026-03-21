'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import {
  GitBranch, Code, Search, PenTool, ChevronDown, ChevronRight,
  DollarSign, ExternalLink, Cpu, CheckCircle2, Clock, Loader2,
  XCircle, Boxes
} from 'lucide-react';

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

const TYPE_CONFIG: Record<string, { icon: typeof Code; bg: string; text: string; border: string }> = {
  code:         { icon: Code,    bg: 'bg-blue-500/10',   text: 'text-blue-600',   border: 'border-blue-200' },
  research:     { icon: Search,  bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-200' },
  copy:         { icon: PenTool, bg: 'bg-pink-500/10',   text: 'text-pink-600',   border: 'border-pink-200' },
  orchestrator: { icon: Cpu,     bg: 'bg-violet-500/10', text: 'text-violet-600', border: 'border-violet-200' },
};

const STATUS_PIPELINE: Record<string, {
  icon: typeof CheckCircle2;
  color: string;
  pulse: boolean;
  label: string;
}> = {
  pending:     { icon: Clock,         color: 'text-slate-400',   pulse: false, label: 'Pending' },
  assigned:    { icon: Loader2,        color: 'text-blue-500',    pulse: true,  label: 'Assigned' },
  in_progress: { icon: Loader2,        color: 'text-amber-500',   pulse: true,  label: 'In Progress' },
  working:     { icon: Loader2,        color: 'text-amber-500',   pulse: true,  label: 'Working' },
  delivered:   { icon: CheckCircle2,   color: 'text-purple-500',  pulse: false, label: 'Delivered' },
  approved:    { icon: CheckCircle2,   color: 'text-green-500',   pulse: false, label: 'Approved' },
  completed:   { icon: CheckCircle2,   color: 'text-green-500',   pulse: false, label: 'Completed' },
  failed:      { icon: XCircle,        color: 'text-red-500',     pulse: false, label: 'Failed' },
  rejected:    { icon: XCircle,        color: 'text-red-500',     pulse: false, label: 'Rejected' },
};

const AGENT_TYPE_INITIALS: Record<string, string> = {
  code: 'CD',
  research: 'RE',
  copy: 'CP',
  orchestrator: 'OR',
};

const AGENT_TYPE_COLORS: Record<string, string> = {
  code: 'from-blue-500 to-cyan-500',
  research: 'from-emerald-500 to-green-400',
  copy: 'from-pink-500 to-rose-400',
  orchestrator: 'from-violet-500 to-orange-500',
};

function getCompletedCount(subtasks: SubtaskData[]) {
  return subtasks.filter((s) =>
    ['completed', 'approved', 'delivered', 'released'].includes(s.status)
  ).length;
}

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
    const relevantEvent = events.find((e) => e.taskId === taskId);
    if (relevantEvent) fetchTask();
  }, [taskId, events]);

  if (!taskId) return null;

  if (!task) {
    return (
      <Card className="border-violet-100">
        <CardContent className="py-12 flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500/10 to-orange-500/10 flex items-center justify-center">
            <Boxes className="h-6 w-6 text-violet-400" />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
            Loading task flow…
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedCount = getCompletedCount(task.subtasks);
  const totalCount = task.subtasks.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isTaskComplete = ['completed', 'approved'].includes(task.status);

  return (
    <Card className="border-violet-100 overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-violet-50/60 to-transparent">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-orange-500 flex items-center justify-center shadow-sm shrink-0">
              <GitBranch className="h-3.5 w-3.5 text-white" />
            </div>
            <CardTitle className="text-base font-semibold">Task Flow</CardTitle>
          </div>
          <StatusBadge status={task.status} />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mt-1 line-clamp-2">
          {task.description}
        </p>

        {/* Overall progress bar */}
        {totalCount > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Progress
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {completedCount}/{totalCount} subtasks · {progressPct}%
              </span>
            </div>
            <div className="h-1.5 bg-violet-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  isTaskComplete
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                    : 'bg-gradient-to-r from-violet-500 to-orange-400'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-0 px-4 pb-4">
        {/* Empty state */}
        {task.subtasks.length === 0 && (
          <div className="py-10 flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-100 to-orange-50 flex items-center justify-center">
                <Cpu className="h-7 w-7 text-violet-400" />
              </div>
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-400 flex items-center justify-center">
                <Loader2 className="h-2.5 w-2.5 text-white animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Decomposing task</p>
              <p className="text-xs text-muted-foreground mt-0.5">Forba is breaking your task into specialist subtasks…</p>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-violet-300 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Pipeline */}
        {task.subtasks.map((subtask, index) => {
          const typeConf = TYPE_CONFIG[subtask.type] || TYPE_CONFIG.code;
          const statusConf = STATUS_PIPELINE[subtask.status] || STATUS_PIPELINE.pending;
          const Icon = typeConf.icon;
          const StatusIcon = statusConf.icon;
          const isExpanded = expandedSubtask === subtask.id;
          const isLast = index === task.subtasks.length - 1;
          const agentGrad = subtask.assignedAgent
            ? AGENT_TYPE_COLORS[subtask.assignedAgent.type] || 'from-violet-500 to-orange-500'
            : null;
          const agentInitials = subtask.assignedAgent
            ? AGENT_TYPE_INITIALS[subtask.assignedAgent.type] || 'AG'
            : null;

          return (
            <div key={subtask.id} className="relative">
              {/* Vertical connector line */}
              {!isLast && (
                <div className="absolute left-[23px] top-[52px] w-px h-[calc(100%-8px)] bg-gradient-to-b from-violet-200 to-transparent z-0" />
              )}

              <div className="relative z-10 mt-2">
                <button
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 text-left group ${
                    isExpanded
                      ? `border-violet-200 bg-violet-50/60 shadow-sm`
                      : `border-transparent hover:border-violet-100 hover:bg-violet-50/30`
                  }`}
                  onClick={() => setExpandedSubtask(isExpanded ? null : subtask.id)}
                >
                  {/* Type icon */}
                  <div
                    className={`h-9 w-9 rounded-xl border ${typeConf.bg} ${typeConf.border} flex items-center justify-center shrink-0 mt-0.5`}
                  >
                    <Icon className={`h-4 w-4 ${typeConf.text}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug group-hover:text-violet-700 transition-colors">
                        {subtask.description}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {/* Status icon */}
                      <div className="flex items-center gap-1">
                        <StatusIcon
                          className={`h-3.5 w-3.5 ${statusConf.color} ${statusConf.pulse ? 'animate-spin' : ''}`}
                          style={statusConf.pulse ? { animationDuration: '2s' } : {}}
                        />
                        <span className={`text-[10px] font-medium ${statusConf.color}`}>
                          {statusConf.label}
                        </span>
                      </div>

                      {/* Agent avatar */}
                      {subtask.assignedAgent && agentGrad && agentInitials && (
                        <div className="flex items-center gap-1">
                          <div
                            className={`h-4 w-4 rounded-full bg-gradient-to-br ${agentGrad} flex items-center justify-center`}
                          >
                            <span className="text-[7px] font-bold text-white leading-none">{agentInitials}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {subtask.assignedAgent.name}
                          </span>
                        </div>
                      )}

                      {/* Escrow amount */}
                      {subtask.escrow && (
                        <span className="text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">
                          ${subtask.escrow.amount.toFixed(2)} USDC
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="mx-3 mb-2 rounded-xl border border-violet-100 bg-white/60 divide-y divide-violet-50 overflow-hidden">
                    {subtask.evaluationReason && (
                      <div className="px-3 py-2 text-xs">
                        <span className="font-medium text-violet-700">Evaluation:</span>{' '}
                        <span className="text-muted-foreground">{subtask.evaluationReason}</span>
                      </div>
                    )}
                    {subtask.escrow?.releaseTxHash && (
                      <div className="px-3 py-2 flex items-center gap-2">
                        <DollarSign className="h-3 w-3 text-green-500 shrink-0" />
                        <span className="text-xs font-medium text-green-700">Payment released</span>
                        <a
                          href={`https://sepolia.basescan.org/tx/${subtask.escrow.releaseTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto flex items-center gap-1 text-[10px] text-violet-600 hover:text-violet-800 transition-colors font-mono"
                        >
                          {subtask.escrow.releaseTxHash.substring(0, 12)}…
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {subtask.deliverable && (
                      <details className="px-3 py-2">
                        <summary className="text-xs font-medium text-violet-700 cursor-pointer hover:text-violet-900 select-none">
                          View Deliverable
                        </summary>
                        <pre className="mt-2 p-2 bg-slate-950 text-green-400 rounded-lg text-[10px] overflow-auto max-h-[200px] whitespace-pre-wrap font-mono leading-relaxed">
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

        {/* Final result */}
        {task.finalResult && (
          <div className="mt-4 pt-4 border-t border-violet-100">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <h4 className="text-sm font-semibold text-green-700">Final Result</h4>
            </div>
            <pre className="p-3 bg-slate-950 text-green-400 rounded-xl text-[11px] overflow-auto max-h-[300px] whitespace-pre-wrap font-mono leading-relaxed">
              {task.finalResult}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
