import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSSE } from '@/hooks/useSSE';

// ── Mock EventSource ─────────────────────────────────────────────────────────
class MockEventSource {
  static instances: MockEventSource[] = [];

  url: string;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private listeners: Map<string, ((e: MessageEvent) => void)[]> = new Map();
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, handler: (e: MessageEvent) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type)!.push(handler);
  }

  dispatchEvent(type: string, data: unknown) {
    const handlers = this.listeners.get(type) || [];
    const event = { data: JSON.stringify(data) } as MessageEvent;
    handlers.forEach((h) => h(event));
  }

  close() {
    this.closed = true;
  }

  triggerOpen() {
    this.onopen?.();
  }

  triggerError() {
    this.onerror?.();
  }
}

beforeEach(() => {
  MockEventSource.instances = [];
  vi.stubGlobal('EventSource', MockEventSource);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ──────────────────────────────────────────────────────────────────────────────
describe('useSSE()', () => {
  it('starts with empty events and disconnected state', () => {
    const { result } = renderHook(() => useSSE());
    expect(result.current.events).toEqual([]);
    expect(result.current.connected).toBe(false);
  });

  it('creates an EventSource pointing to /api/events', () => {
    renderHook(() => useSSE());
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe('/api/events');
  });

  it('sets connected=true when EventSource opens', () => {
    const { result } = renderHook(() => useSSE());
    act(() => {
      MockEventSource.instances[0].triggerOpen();
    });
    expect(result.current.connected).toBe(true);
  });

  it('sets connected=false when EventSource errors', () => {
    const { result } = renderHook(() => useSSE());
    act(() => {
      MockEventSource.instances[0].triggerOpen();
    });
    act(() => {
      MockEventSource.instances[0].triggerError();
    });
    expect(result.current.connected).toBe(false);
  });

  it('adds events to state when SSE messages arrive', () => {
    const { result } = renderHook(() => useSSE());
    const event = {
      id: 'evt-1',
      type: 'task:created',
      taskId: 't1',
      message: 'Task created',
      timestamp: new Date().toISOString(),
    };

    act(() => {
      MockEventSource.instances[0].dispatchEvent('task:created', event);
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].id).toBe('evt-1');
    expect(result.current.events[0].type).toBe('task:created');
  });

  it('accumulates multiple events', () => {
    const { result } = renderHook(() => useSSE());
    const src = MockEventSource.instances[0];

    act(() => {
      src.dispatchEvent('task:created', { id: 'e1', type: 'task:created', message: 'm1', timestamp: 't' });
      src.dispatchEvent('agent:hired', { id: 'e2', type: 'agent:hired', message: 'm2', timestamp: 't' });
    });

    expect(result.current.events).toHaveLength(2);
  });

  it('clearEvents() resets events to empty array', () => {
    const { result } = renderHook(() => useSSE());
    const src = MockEventSource.instances[0];

    act(() => {
      src.dispatchEvent('task:completed', { id: 'e1', type: 'task:completed', message: 'done', timestamp: 't' });
    });
    expect(result.current.events).toHaveLength(1);

    act(() => {
      result.current.clearEvents();
    });
    expect(result.current.events).toHaveLength(0);
  });

  it('closes EventSource on unmount', () => {
    const { unmount } = renderHook(() => useSSE());
    const src = MockEventSource.instances[0];
    expect(src.closed).toBe(false);

    unmount();
    expect(src.closed).toBe(true);
  });

  it('does not crash on invalid JSON in SSE data', () => {
    const { result } = renderHook(() => useSSE());
    const src = MockEventSource.instances[0];

    // Manually dispatch a bad event bypassing dispatchEvent helper
    const handlers = (src as unknown as { listeners: Map<string, ((e: MessageEvent) => void)[]> })
      .listeners.get('task:created') || [];
    act(() => {
      handlers.forEach((h) => h({ data: 'not-valid-json' } as MessageEvent));
    });

    // Events should remain empty — no crash
    expect(result.current.events).toHaveLength(0);
  });

  it('listens to all required event types', () => {
    renderHook(() => useSSE());
    const src = MockEventSource.instances[0];
    const registeredTypes = [
      ...(src as unknown as { listeners: Map<string, unknown> }).listeners.keys(),
    ];

    const required = [
      'task:created', 'task:decomposed', 'task:completed', 'task:failed',
      'agent:hired', 'agent:working', 'agent:delivered',
      'escrow:created', 'escrow:funded', 'escrow:released', 'escrow:refunded',
      'evaluation:started', 'evaluation:passed', 'evaluation:failed',
      'swap:initiated', 'swap:completed',
      'system:error',
    ];
    for (const type of required) {
      expect(registeredTypes).toContain(type);
    }
  });
});
