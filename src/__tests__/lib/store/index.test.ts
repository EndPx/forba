import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '@/lib/store';
import type { Agent } from '@/lib/types';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'agent-1',
    name: 'TestAgent',
    type: 'code',
    description: 'A test agent',
    capabilities: ['typescript'],
    pricing: 0.05,
    locusApiKey: 'mock-key',
    locusWalletId: 'mock-wallet',
    locusOwnerAddress: '0x1234567890abcdef1234567890abcdef12345678',
    preferredToken: 'USDC',
    status: 'idle',
    totalEarnings: 0,
    tasksCompleted: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  store.reset();
});

// ──────────────────────────────────────────────────────────────────────────────
// Task CRUD
// ──────────────────────────────────────────────────────────────────────────────
describe('store task operations', () => {
  it('createTask() returns task with pending status and unique id', () => {
    const task = store.createTask('Build a website');
    expect(task.id).toBeTruthy();
    expect(task.description).toBe('Build a website');
    expect(task.status).toBe('pending');
    expect(task.subtasks).toEqual([]);
    expect(task.createdAt).toBeTruthy();
  });

  it('createTask() generates unique ids for each task', () => {
    const t1 = store.createTask('Task 1');
    const t2 = store.createTask('Task 2');
    expect(t1.id).not.toBe(t2.id);
  });

  it('getTask() returns the task by id', () => {
    const task = store.createTask('Find me');
    const found = store.getTask(task.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(task.id);
  });

  it('getTask() returns undefined for unknown id', () => {
    expect(store.getTask('non-existent-id')).toBeUndefined();
  });

  it('updateTask() merges partial updates', () => {
    const task = store.createTask('Update me');
    const updated = store.updateTask(task.id, { status: 'completed', finalResult: 'Done!' });
    expect(updated.status).toBe('completed');
    expect(updated.finalResult).toBe('Done!');
    expect(updated.description).toBe('Update me');
  });

  it('updateTask() throws when task not found', () => {
    expect(() => store.updateTask('ghost-id', { status: 'failed' })).toThrow('Task not found: ghost-id');
  });

  it('getAllTasks() returns tasks sorted newest first', () => {
    const t1 = store.createTask('First');
    // Ensure different createdAt by manipulating the stored task
    store.updateTask(t1.id, { createdAt: new Date(Date.now() - 10000).toISOString() });
    store.createTask('Second');

    const all = store.getAllTasks();
    expect(all[0].description).toBe('Second');
    expect(all[1].description).toBe('First');
  });

  it('getAllTasks() returns empty array when no tasks', () => {
    expect(store.getAllTasks()).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Agent CRUD
// ──────────────────────────────────────────────────────────────────────────────
describe('store agent operations', () => {
  it('registerAgent() stores and returns the agent', () => {
    const agent = makeAgent({ id: 'a-1', name: 'Coder' });
    const result = store.registerAgent(agent);
    expect(result).toEqual(agent);
    expect(store.getAgent('a-1')).toEqual(agent);
  });

  it('getAgent() returns undefined for unknown id', () => {
    expect(store.getAgent('no-such-agent')).toBeUndefined();
  });

  it('updateAgent() merges partial updates', () => {
    const agent = makeAgent({ id: 'a-2' });
    store.registerAgent(agent);
    const updated = store.updateAgent('a-2', { status: 'working', totalEarnings: 0.05 });
    expect(updated.status).toBe('working');
    expect(updated.totalEarnings).toBe(0.05);
    expect(updated.name).toBe('TestAgent');
  });

  it('updateAgent() throws when agent not found', () => {
    expect(() => store.updateAgent('ghost', { status: 'idle' })).toThrow('Agent not found: ghost');
  });

  it('getAgentsByType() filters by type and excludes offline agents', () => {
    store.registerAgent(makeAgent({ id: 'a-code', type: 'code', status: 'idle' }));
    store.registerAgent(makeAgent({ id: 'a-research', type: 'research', status: 'idle' }));
    store.registerAgent(makeAgent({ id: 'a-offline', type: 'code', status: 'offline' }));

    const codeAgents = store.getAgentsByType('code');
    expect(codeAgents).toHaveLength(1);
    expect(codeAgents[0].id).toBe('a-code');
  });

  it('getAllAgents() returns all agents regardless of status', () => {
    store.registerAgent(makeAgent({ id: 'x1', status: 'idle' }));
    store.registerAgent(makeAgent({ id: 'x2', status: 'offline' }));
    expect(store.getAllAgents()).toHaveLength(2);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Stats
// ──────────────────────────────────────────────────────────────────────────────
describe('store.getStats()', () => {
  it('returns zeroed stats when store is empty', () => {
    const stats = store.getStats();
    expect(stats.totalTasks).toBe(0);
    expect(stats.completedTasks).toBe(0);
    expect(stats.activeTasks).toBe(0);
    expect(stats.totalAgents).toBe(0);
  });

  it('counts completed and active tasks correctly', () => {
    const t1 = store.createTask('t1');
    const t2 = store.createTask('t2');
    store.createTask('t3');

    store.updateTask(t1.id, { status: 'completed' });
    store.updateTask(t2.id, { status: 'in_progress' });
    // t3 stays pending

    const stats = store.getStats();
    expect(stats.totalTasks).toBe(3);
    expect(stats.completedTasks).toBe(1);
    expect(stats.activeTasks).toBe(2); // pending + in_progress
  });

  it('counts agents', () => {
    store.registerAgent(makeAgent({ id: 'sa-1' }));
    store.registerAgent(makeAgent({ id: 'sa-2' }));
    expect(store.getStats().totalAgents).toBe(2);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Reset
// ──────────────────────────────────────────────────────────────────────────────
describe('store.reset()', () => {
  it('clears all tasks and agents', () => {
    store.createTask('Task');
    store.registerAgent(makeAgent({ id: 'r-1' }));

    store.reset();

    expect(store.getAllTasks()).toHaveLength(0);
    expect(store.getAllAgents()).toHaveLength(0);
  });
});
