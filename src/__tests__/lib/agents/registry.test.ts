import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock locus registration so seedAgents doesn't make real HTTP calls
vi.mock('@/lib/payments/locus', () => ({
  registerAgent: vi.fn().mockResolvedValue({
    apiKey: 'mock-api-key',
    walletId: 'mock-wallet-id',
    ownerAddress: '0xMOCKADDRESS',
  }),
}));

import { seedAgents, discoverAgents, selectBestAgent, getAgentPublicInfo } from '@/lib/agents/registry';
import { store } from '@/lib/store';
import type { Agent } from '@/lib/types';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'a-1',
    name: 'TestAgent',
    type: 'code',
    description: 'desc',
    capabilities: ['ts'],
    pricing: 0.05,
    locusApiKey: 'mock-key',
    locusWalletId: 'mock-wallet',
    locusOwnerAddress: '0xADDR',
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
  // Reset the seeded flag so seedAgents can run fresh
  (globalThis as Record<string, unknown>).__forbaAgentsSeeded = false;
});

// ──────────────────────────────────────────────────────────────────────────────
// seedAgents
// ──────────────────────────────────────────────────────────────────────────────
describe('seedAgents()', () => {
  it('seeds exactly 6 agents', async () => {
    const agents = await seedAgents();
    expect(agents).toHaveLength(6);
  });

  it('seeds 2 code agents, 2 research agents, 2 copy agents', async () => {
    const agents = await seedAgents();
    const types = agents.map((a) => a.type);
    expect(types.filter((t) => t === 'code')).toHaveLength(2);
    expect(types.filter((t) => t === 'research')).toHaveLength(2);
    expect(types.filter((t) => t === 'copy')).toHaveLength(2);
  });

  it('each seeded agent has required fields', async () => {
    const agents = await seedAgents();
    for (const agent of agents) {
      expect(agent.id).toBeTruthy();
      expect(agent.name).toBeTruthy();
      expect(agent.locusApiKey).toBeTruthy();
      expect(agent.locusWalletId).toBeTruthy();
      expect(agent.locusOwnerAddress).toBeTruthy();
      expect(agent.status).toBe('idle');
      expect(agent.totalEarnings).toBe(0);
      expect(agent.tasksCompleted).toBe(0);
    }
  });

  it('skips seeding if already seeded and store has agents', async () => {
    await seedAgents(); // first seed
    const secondResult = await seedAgents(); // should skip
    expect(secondResult).toHaveLength(6); // still returns stored agents
    // Only 6 agents in store (not 12)
    expect(store.getAllAgents()).toHaveLength(6);
  });

  it('uses mock data when locus registration fails', async () => {
    const { registerAgent } = await import('@/lib/payments/locus');
    vi.mocked(registerAgent).mockRejectedValueOnce(new Error('Locus down'));

    const agents = await seedAgents();
    // Should still seed — with mock fallback
    expect(agents.length).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// discoverAgents (findAgentsByType)
// ──────────────────────────────────────────────────────────────────────────────
describe('discoverAgents()', () => {
  beforeEach(() => {
    store.registerAgent(makeAgent({ id: 'c1', type: 'code', status: 'idle' }));
    store.registerAgent(makeAgent({ id: 'c2', type: 'code', status: 'working' }));
    store.registerAgent(makeAgent({ id: 'r1', type: 'research', status: 'idle' }));
    store.registerAgent(makeAgent({ id: 'cp1', type: 'copy', status: 'offline' }));
  });

  it('returns agents of the specified type (excluding offline)', () => {
    const codeAgents = discoverAgents('code');
    expect(codeAgents).toHaveLength(2);
    expect(codeAgents.every((a) => a.type === 'code')).toBe(true);
  });

  it('excludes offline agents', () => {
    const copyAgents = discoverAgents('copy');
    expect(copyAgents).toHaveLength(0);
  });

  it('returns empty array when no agents of that type', () => {
    expect(discoverAgents('orchestrator')).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// selectBestAgent
// ──────────────────────────────────────────────────────────────────────────────
describe('selectBestAgent()', () => {
  it('returns null for empty agent list', () => {
    expect(selectBestAgent([], 'do something')).toBeNull();
  });

  it('returns the single agent when only one is available', () => {
    const agent = makeAgent({ id: 'only-one' });
    expect(selectBestAgent([agent], 'task')).toEqual(agent);
  });

  it('prefers idle agents over working agents', () => {
    const idle = makeAgent({ id: 'idle-agent', status: 'idle', pricing: 0.10 });
    const working = makeAgent({ id: 'working-agent', status: 'working', pricing: 0.01 });
    const selected = selectBestAgent([working, idle], 'task');
    expect(selected!.id).toBe('idle-agent');
  });

  it('among idle agents, prefers fewer tasks completed (load balance)', () => {
    const less = makeAgent({ id: 'less-tasks', status: 'idle', tasksCompleted: 2, pricing: 0.10 });
    const more = makeAgent({ id: 'more-tasks', status: 'idle', tasksCompleted: 10, pricing: 0.01 });
    const selected = selectBestAgent([more, less], 'task');
    expect(selected!.id).toBe('less-tasks');
  });

  it('among equally loaded idle agents, prefers cheaper pricing', () => {
    const cheaper = makeAgent({ id: 'cheaper', status: 'idle', tasksCompleted: 5, pricing: 0.03 });
    const pricier = makeAgent({ id: 'pricier', status: 'idle', tasksCompleted: 5, pricing: 0.08 });
    const selected = selectBestAgent([pricier, cheaper], 'task');
    expect(selected!.id).toBe('cheaper');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// getAgentPublicInfo
// ──────────────────────────────────────────────────────────────────────────────
describe('getAgentPublicInfo()', () => {
  it('returns public fields only (no locusApiKey)', () => {
    const agent = makeAgent({ id: 'pub-1' });
    const info = getAgentPublicInfo(agent);

    expect(info).toHaveProperty('id');
    expect(info).toHaveProperty('name');
    expect(info).toHaveProperty('type');
    expect(info).toHaveProperty('description');
    expect(info).toHaveProperty('capabilities');
    expect(info).toHaveProperty('pricing');
    expect(info).toHaveProperty('preferredToken');
    expect(info).toHaveProperty('status');
    expect(info).toHaveProperty('totalEarnings');
    expect(info).toHaveProperty('tasksCompleted');
    expect(info).not.toHaveProperty('locusApiKey');
    expect(info).not.toHaveProperty('locusWalletId');
    expect(info).not.toHaveProperty('locusOwnerAddress');
  });
});
