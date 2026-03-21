'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Zap, Users, DollarSign, CheckCircle, XCircle, AlertCircle, ArrowRightLeft } from 'lucide-react';

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

const EVENT_ICONS: Record<string, typeof Activity> = {
  'task:created': Zap,
  'task:decomposed': Zap,
  'task:completed': CheckCircle,
  'task:failed': XCircle,
  'agent:hired': Users,
  'agent:working': Users,
  'agent:delivered': Users,
  'escrow:created': DollarSign,
  'escrow:funded': DollarSign,
  'escrow:released': DollarSign,
  'escrow:refunded': DollarSign,
  'evaluation:started': Activity,
  'evaluation:passed': CheckCircle,
  'evaluation:failed': XCircle,
  'swap:initiated': ArrowRightLeft,
  'swap:completed': ArrowRightLeft,
  'system:error': AlertCircle,
};

const EVENT_COLORS: Record<string, string> = {
  'task:created': 'text-blue-500',
  'task:decomposed': 'text-blue-500',
  'task:completed': 'text-green-500',
  'task:failed': 'text-red-500',
  'agent:hired': 'text-violet-500',
  'agent:working': 'text-amber-500',
  'agent:delivered': 'text-purple-500',
  'escrow:created': 'text-gray-500',
  'escrow:funded': 'text-amber-500',
  'escrow:released': 'text-green-500',
  'escrow:refunded': 'text-red-500',
  'evaluation:started': 'text-blue-500',
  'evaluation:passed': 'text-green-500',
  'evaluation:failed': 'text-red-500',
  'swap:initiated': 'text-amber-500',
  'swap:completed': 'text-green-500',
  'system:error': 'text-red-500',
};

export function LiveFeed({ events, connected }: { events: AgentEvent[]; connected: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-violet-500" />
            Live Feed
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs text-muted-foreground">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={scrollRef} className="h-[400px] overflow-y-auto space-y-2 pr-2">
          {events.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              Waiting for events... Submit a task to get started.
            </div>
          )}

          {events.map((event) => {
            const Icon = EVENT_ICONS[event.type] || Activity;
            const color = EVENT_COLORS[event.type] || 'text-gray-500';

            return (
              <div key={event.id} className="flex items-start gap-2 p-2 rounded-md hover:bg-accent/30 transition-colors">
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{event.message}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {event.type}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
