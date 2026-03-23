'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, Zap, Brain, Users, Shield, Coins, Package } from 'lucide-react';
import type { StreamProgress } from '@/hooks/useTask';

// ── Phase config ────────────────────────────────────────────────────────────

const PHASES = [
  { key: 'creating',   label: 'Creating Task',       icon: Zap },
  { key: 'decomposing', label: 'Decomposing',        icon: Brain },
  { key: 'hiring',     label: 'Hiring Agents',       icon: Users },
  { key: 'executing',  label: 'Executing Subtasks',  icon: Coins },
  { key: 'evaluating', label: 'Evaluating Work',     icon: Shield },
  { key: 'compiling',  label: 'Compiling Results',   icon: Package },
] as const;

const PHASE_ORDER: Record<string, number> = {};
PHASES.forEach((p, i) => { PHASE_ORDER[p.key] = i; });

function getPhaseIndex(phase: string): number {
  return PHASE_ORDER[phase] ?? -1;
}

// ── Event → human label ─────────────────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
  'task:created':       'Task registered',
  'task:decomposed':    'Subtasks identified',
  'agent:hired':        'Agent hired',
  'escrow:created':     'Escrow funded',
  'evaluation:started': 'Evaluating deliverable',
  'evaluation:passed':  'Quality approved',
  'evaluation:failed':  'Quality rejected',
  'escrow:released':    'Payment released',
  'escrow:refunded':    'Payment refunded',
  'task:completed':     'Task completed',
  'task:failed':        'Task failed',
};

const EVENT_COLORS: Record<string, string> = {
  'task:completed':     'text-green-600',
  'evaluation:passed':  'text-green-600',
  'escrow:released':    'text-green-600',
  'task:failed':        'text-red-500',
  'evaluation:failed':  'text-red-500',
  'escrow:refunded':    'text-amber-500',
  'agent:hired':        'text-blue-500',
  'escrow:created':     'text-blue-500',
};

// ── Component ───────────────────────────────────────────────────────────────

interface Props {
  progress: StreamProgress[];
  phase: string;
  isStreaming: boolean;
}

export function ProgressTimeline({ progress, phase, isStreaming }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentPhaseIdx = getPhaseIndex(phase);
  const isDone = phase === 'done';
  const isFailed = phase === 'failed';

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [progress]);

  return (
    <Card className="border-zinc-200 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-zinc-900">
            {isDone ? '✓ Task Complete' : isFailed ? '✗ Task Failed' : 'Processing Task'}
          </CardTitle>
          {isStreaming && (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              Live
            </span>
          )}
          {isDone && (
            <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Done
            </span>
          )}
          {isFailed && (
            <span className="inline-flex items-center gap-1.5 text-xs text-red-500">
              <XCircle className="h-3.5 w-3.5" />
              Failed
            </span>
          )}
        </div>

        {/* Phase steps */}
        <div className="flex items-center gap-0 mt-3">
          {PHASES.map((p, i) => {
            const Icon = p.icon;
            const isComplete = isDone || currentPhaseIdx > i;
            const isCurrent = !isDone && !isFailed && currentPhaseIdx === i;
            const isPending = !isDone && currentPhaseIdx < i;

            return (
              <div key={p.key} className="flex items-center flex-1">
                {/* Step indicator */}
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isComplete
                        ? 'bg-green-100 text-green-600'
                        : isCurrent
                        ? 'bg-zinc-900 text-white ring-2 ring-zinc-900/20'
                        : isFailed && currentPhaseIdx === i
                        ? 'bg-red-100 text-red-500'
                        : 'bg-zinc-100 text-zinc-300'
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isCurrent ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-medium text-center leading-tight ${
                      isComplete ? 'text-green-600' : isCurrent ? 'text-zinc-900' : isPending ? 'text-zinc-300' : 'text-zinc-400'
                    }`}
                  >
                    {p.label}
                  </span>
                </div>

                {/* Connector line */}
                {i < PHASES.length - 1 && (
                  <div className={`h-px flex-1 -mt-4 mx-0.5 transition-colors duration-300 ${
                    isComplete ? 'bg-green-300' : 'bg-zinc-100'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </CardHeader>

      {/* Event stream */}
      <CardContent className="px-4 pb-4 pt-0">
        <div
          ref={scrollRef}
          className="max-h-[200px] overflow-y-auto space-y-0 border-t border-zinc-100 pt-3"
        >
          {progress.filter(e => e.type === 'progress').map((event, i) => {
            const label = EVENT_LABELS[event.event || ''] || event.event || '';
            const color = EVENT_COLORS[event.event || ''] || 'text-zinc-500';
            const agentName = event.data?.agentName as string | undefined;
            const amount = event.data?.amount as number | undefined;

            return (
              <div
                key={i}
                className="flex items-start gap-2.5 py-1.5 animate-in fade-in slide-in-from-bottom-1 duration-300"
              >
                <span className="text-[10px] text-zinc-300 tabular-nums shrink-0 mt-0.5 font-mono">
                  {event.timestamp
                    ? new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : '--:--:--'}
                </span>
                <span className={`text-xs font-medium shrink-0 ${color}`}>
                  {label}
                </span>
                <span className="text-xs text-zinc-400 truncate">
                  {agentName && <span className="text-zinc-600">{agentName}</span>}
                  {amount != null && <span className="ml-1 font-mono">${amount.toFixed(2)}</span>}
                  {!agentName && !amount && event.message && (
                    <span>{event.message.substring(0, 80)}</span>
                  )}
                </span>
              </div>
            );
          })}

          {isStreaming && (
            <div className="flex items-center gap-2 py-2 text-xs text-zinc-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Waiting for next event…</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
