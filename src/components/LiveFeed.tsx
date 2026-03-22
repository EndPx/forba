'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

const EVENT_DOT: Record<string, string> = {
  'task:completed':    'bg-green-500',
  'evaluation:passed': 'bg-green-500',
  'escrow:released':   'bg-green-500',
  'swap:completed':    'bg-green-500',
  'agent:delivered':   'bg-green-500',
  'task:failed':       'bg-red-400',
  'evaluation:failed': 'bg-red-400',
  'escrow:refunded':   'bg-red-400',
  'system:error':      'bg-red-400',
  'agent:working':     'bg-amber-400',
  'escrow:funded':     'bg-amber-400',
  'swap:initiated':    'bg-amber-400',
};

function getDot(type: string): string {
  return EVENT_DOT[type] || 'bg-zinc-300';
}

export function LiveFeed({ events, connected }: { events: AgentEvent[]; connected: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [events]);

  return (
    <Card className="h-full border-zinc-200 flex flex-col overflow-hidden">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-zinc-900">Event Log</CardTitle>
          <span className={`inline-flex items-center gap-1.5 text-xs ${connected ? 'text-green-600' : 'text-zinc-400'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-zinc-300'}`} />
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0 px-4 pb-4">
        <div
          ref={scrollRef}
          className="h-[420px] overflow-y-auto space-y-0 custom-scrollbar"
        >
          {events.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-xs text-zinc-400">Waiting for events…</p>
            </div>
          ) : (
            <div className="font-mono text-xs">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-2.5 py-1.5 border-b border-zinc-50 last:border-0"
                >
                  <span className="text-zinc-300 tabular-nums shrink-0 mt-0.5">
                    {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 mt-1.5 ${getDot(event.type)}`} />
                  <span className="text-zinc-600 leading-relaxed break-all">{event.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
