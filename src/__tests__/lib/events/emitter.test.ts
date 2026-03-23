import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emitter } from '@/lib/events/emitter';

beforeEach(() => {
  emitter.clear();
});

// ──────────────────────────────────────────────────────────────────────────────
// emit()
// ──────────────────────────────────────────────────────────────────────────────
describe('emitter.emit()', () => {
  it('returns an AgentEvent with id, type, and timestamp', () => {
    const event = emitter.emit('task:created', { taskId: 't1', message: 'Created' });
    expect(event.id).toBeTruthy();
    expect(event.type).toBe('task:created');
    expect(event.message).toBe('Created');
    expect(event.taskId).toBe('t1');
    expect(event.timestamp).toBeTruthy();
  });

  it('fires all registered listeners', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    emitter.subscribe(listener1);
    emitter.subscribe(listener2);

    emitter.emit('agent:hired', { taskId: 't1', message: 'Hired' });

    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).toHaveBeenCalledOnce();
  });

  it('passes the full event object to listeners', () => {
    const listener = vi.fn();
    emitter.subscribe(listener);

    emitter.emit('escrow:created', { taskId: 't2', subtaskId: 's1', message: 'Escrow' });

    const received = listener.mock.calls[0][0];
    expect(received.type).toBe('escrow:created');
    expect(received.taskId).toBe('t2');
    expect(received.subtaskId).toBe('s1');
  });

  it('does not throw if a listener throws', () => {
    const badListener = vi.fn().mockImplementation(() => { throw new Error('Listener error'); });
    const goodListener = vi.fn();
    emitter.subscribe(badListener);
    emitter.subscribe(goodListener);

    // Should not propagate error
    expect(() => emitter.emit('system:error', { message: 'test' })).not.toThrow();
    expect(goodListener).toHaveBeenCalledOnce();
  });

  it('stores events in history', () => {
    emitter.emit('task:completed', { taskId: 'tc', message: 'Done' });
    const history = emitter.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].type).toBe('task:completed');
  });

  it('emits optional agentId and data fields', () => {
    const event = emitter.emit('agent:working', {
      taskId: 't3',
      agentId: 'a1',
      message: 'Working',
      data: { progress: 50 },
    });
    expect(event.agentId).toBe('a1');
    expect(event.data).toEqual({ progress: 50 });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// subscribe() / unsubscribe
// ──────────────────────────────────────────────────────────────────────────────
describe('emitter.subscribe()', () => {
  it('returns an unsubscribe function', () => {
    const listener = vi.fn();
    const unsubscribe = emitter.subscribe(listener);
    expect(typeof unsubscribe).toBe('function');

    unsubscribe();
    emitter.emit('task:failed', { taskId: 't4', message: 'Failed' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('multiple subscriptions are independent', () => {
    const l1 = vi.fn();
    const l2 = vi.fn();
    const unsub1 = emitter.subscribe(l1);
    emitter.subscribe(l2);

    unsub1();
    emitter.emit('evaluation:passed', { taskId: 't', message: 'Passed' });

    expect(l1).not.toHaveBeenCalled();
    expect(l2).toHaveBeenCalledOnce();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// getHistory()
// ──────────────────────────────────────────────────────────────────────────────
describe('emitter.getHistory()', () => {
  it('returns all events when no sinceId provided', () => {
    emitter.emit('task:created', { taskId: 'a', message: 'm1' });
    emitter.emit('task:created', { taskId: 'b', message: 'm2' });
    expect(emitter.getHistory()).toHaveLength(2);
  });

  it('returns events after the given sinceId', () => {
    const e1 = emitter.emit('task:created', { taskId: 'a', message: 'm1' });
    emitter.emit('task:created', { taskId: 'b', message: 'm2' });
    emitter.emit('task:created', { taskId: 'c', message: 'm3' });

    const after = emitter.getHistory(e1.id);
    expect(after).toHaveLength(2);
  });

  it('returns all events when sinceId is not found', () => {
    emitter.emit('task:created', { taskId: 'a', message: 'msg' });
    const result = emitter.getHistory('non-existent-id');
    expect(result).toHaveLength(1);
  });

  it('returns empty array when history is empty', () => {
    expect(emitter.getHistory()).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// getRecentEvents()
// ──────────────────────────────────────────────────────────────────────────────
describe('emitter.getRecentEvents()', () => {
  it('returns the last N events', () => {
    for (let i = 0; i < 10; i++) {
      emitter.emit('task:created', { taskId: `t${i}`, message: `msg${i}` });
    }
    const recent = emitter.getRecentEvents(3);
    expect(recent).toHaveLength(3);
    expect(recent[2].taskId).toBe('t9');
  });

  it('defaults to 50 events', () => {
    for (let i = 0; i < 60; i++) {
      emitter.emit('task:created', { taskId: `t${i}`, message: 'msg' });
    }
    expect(emitter.getRecentEvents()).toHaveLength(50);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// clear()
// ──────────────────────────────────────────────────────────────────────────────
describe('emitter.clear()', () => {
  it('removes all history', () => {
    emitter.emit('task:created', { taskId: 'x', message: 'test' });
    emitter.clear();
    expect(emitter.getHistory()).toHaveLength(0);
  });
});
