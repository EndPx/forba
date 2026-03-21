'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface AgentEvent {
  id: string;
  type: string;
  taskId?: string;
  subtaskId?: string;
  agentId?: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export function useSSE() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const source = new EventSource('/api/events');
    sourceRef.current = source;

    source.onopen = () => setConnected(true);
    source.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects
    };

    const eventTypes = [
      'task:created', 'task:decomposed', 'task:completed', 'task:failed',
      'agent:hired', 'agent:working', 'agent:delivered',
      'escrow:created', 'escrow:funded', 'escrow:released', 'escrow:refunded',
      'evaluation:started', 'evaluation:passed', 'evaluation:failed',
      'swap:initiated', 'swap:completed',
      'system:error',
    ];

    for (const type of eventTypes) {
      source.addEventListener(type, (e: MessageEvent) => {
        try {
          const event = JSON.parse(e.data) as AgentEvent;
          setEvents((prev) => [...prev, event]);
        } catch {
          console.error('Failed to parse SSE event:', e.data);
        }
      });
    }

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, []);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { events, connected, clearEvents };
}
