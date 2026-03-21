'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Activity, Zap, Users, DollarSign, CheckCircle, XCircle,
  AlertCircle, ArrowRightLeft, Radio, WifiOff
} from 'lucide-react';

interface AgentEvent {
  id: string;
  type: string;
  taskId?: string;
  subtaskId?: string;
  agentId?: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

const EVENT_CONFIG: Record<string, {
  icon: typeof Activity;
  bg: string;
  text: string;
  border: string;
  dot: string;
  category: 'success' | 'error' | 'info' | 'warning' | 'money';
}> = {
  'task:created':       { icon: Zap,            bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-100',   dot: 'bg-blue-400',    category: 'info' },
  'task:decomposed':    { icon: Zap,            bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-100',   dot: 'bg-blue-400',    category: 'info' },
  'task:completed':     { icon: CheckCircle,    bg: 'bg-green-50',   text: 'text-green-600',   border: 'border-green-100',  dot: 'bg-green-400',   category: 'success' },
  'task:failed':        { icon: XCircle,        bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-100',    dot: 'bg-red-400',     category: 'error' },
  'agent:hired':        { icon: Users,          bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-100', dot: 'bg-violet-400',  category: 'info' },
  'agent:working':      { icon: Activity,       bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-100',  dot: 'bg-amber-400',   category: 'warning' },
  'agent:delivered':    { icon: CheckCircle,    bg: 'bg-purple-50',  text: 'text-purple-600',  border: 'border-purple-100', dot: 'bg-purple-400',  category: 'success' },
  'escrow:created':     { icon: DollarSign,     bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-100',  dot: 'bg-slate-400',   category: 'money' },
  'escrow:funded':      { icon: DollarSign,     bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-100',  dot: 'bg-amber-400',   category: 'money' },
  'escrow:released':    { icon: DollarSign,     bg: 'bg-green-50',   text: 'text-green-600',   border: 'border-green-100',  dot: 'bg-green-400',   category: 'success' },
  'escrow:refunded':    { icon: DollarSign,     bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-100',    dot: 'bg-red-400',     category: 'error' },
  'evaluation:started': { icon: Activity,       bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-100',   dot: 'bg-blue-400',    category: 'info' },
  'evaluation:passed':  { icon: CheckCircle,    bg: 'bg-green-50',   text: 'text-green-600',   border: 'border-green-100',  dot: 'bg-green-400',   category: 'success' },
  'evaluation:failed':  { icon: XCircle,        bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-100',    dot: 'bg-red-400',     category: 'error' },
  'swap:initiated':     { icon: ArrowRightLeft, bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-100',  dot: 'bg-amber-400',   category: 'warning' },
  'swap:completed':     { icon: ArrowRightLeft, bg: 'bg-green-50',   text: 'text-green-600',   border: 'border-green-100',  dot: 'bg-green-400',   category: 'success' },
  'system:error':       { icon: AlertCircle,    bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-100',    dot: 'bg-red-400',     category: 'error' },
};

const FALLBACK_CONFIG = {
  icon: Activity,
  bg: 'bg-slate-50',
  text: 'text-slate-500',
  border: 'border-slate-100',
  dot: 'bg-slate-300',
  category: 'info' as const,
};

function relativeTime(timestamp: string): string {
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 5)  return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function LiveFeed({ events, connected }: { events: AgentEvent[]; connected: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [events]);

  return (
    <Card className="h-full border-violet-100 overflow-hidden flex flex-col">
      <CardHeader className="pb-3 bg-gradient-to-r from-violet-50/60 to-transparent shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-orange-500 flex items-center justify-center shadow-sm">
              <Radio className="h-3.5 w-3.5 text-white" />
            </div>
            Live Feed
          </CardTitle>

          {/* Connection status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all duration-300 ${
            connected
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-600'
          }`}>
            {connected ? (
              <>
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Connected
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                Disconnected
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0 px-4 pb-4">
        <div
          ref={scrollRef}
          className="h-[420px] overflow-y-auto space-y-1 pr-1 scrollbar-thin"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#ddd6fe transparent' }}
        >
          {events.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center gap-3 py-8">
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-100 to-orange-50 flex items-center justify-center">
                  <Radio className="h-7 w-7 text-violet-300" />
                </div>
                {connected && (
                  <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-green-400 border-2 border-white animate-pulse" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Listening for events</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Dispatch a task to see the agent network in action</p>
              </div>
            </div>
          )}

          {events.map((event, idx) => {
            const conf = EVENT_CONFIG[event.type] || FALLBACK_CONFIG;
            const Icon = conf.icon;
            const isNew = idx === events.length - 1;

            return (
              <div
                key={event.id}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all duration-300 ${conf.bg} ${conf.border} ${
                  isNew ? 'animate-in slide-in-from-bottom-2 fade-in duration-300' : ''
                }`}
              >
                {/* Icon */}
                <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${conf.bg} border ${conf.border}`}>
                  <Icon className={`h-3.5 w-3.5 ${conf.text}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground leading-snug">{event.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${conf.bg} ${conf.text} ${conf.border}`}>
                      {event.type}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                      {relativeTime(event.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Color dot */}
                <div className={`h-1.5 w-1.5 rounded-full shrink-0 mt-1.5 ${conf.dot}`} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
