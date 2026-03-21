import { v4 as uuidv4 } from 'uuid';
import { AgentEvent, EventType } from '../types';

type EventListener = (event: AgentEvent) => void;

const MAX_HISTORY = 500;

class ForbaEventEmitter {
  private listeners: Set<EventListener> = new Set();
  private history: AgentEvent[] = [];

  emit(
    type: EventType,
    payload: Omit<AgentEvent, 'id' | 'type' | 'timestamp'>
  ): AgentEvent {
    const event: AgentEvent = {
      id: uuidv4(),
      type,
      timestamp: new Date().toISOString(),
      ...payload,
    };

    this.history.push(event);
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(-MAX_HISTORY);
    }

    Array.from(this.listeners).forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });

    return event;
  }

  subscribe(callback: EventListener): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  getHistory(sinceId?: string): AgentEvent[] {
    if (!sinceId) return [...this.history];

    const index = this.history.findIndex((e) => e.id === sinceId);
    if (index === -1) return [...this.history];
    return this.history.slice(index + 1);
  }

  getRecentEvents(count: number = 50): AgentEvent[] {
    return this.history.slice(-count);
  }

  clear(): void {
    this.history = [];
  }
}

// Singleton - survives across API route calls within the same process
export const emitter = new ForbaEventEmitter();
