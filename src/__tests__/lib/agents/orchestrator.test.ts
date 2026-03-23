import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks must be declared before imports ──────────────────────────────────

vi.mock('@/lib/llm/client', () => ({
  llmCall: vi.fn(),
  // Use real JSON.parse so decompose/compile both work without per-call ordering
  parseJSON: vi.fn((raw: string) => JSON.parse(raw)),
}));

vi.mock('@/lib/llm/evaluator', () => ({
  evaluateDeliverable: vi.fn(),
}));

vi.mock('@/lib/agents/specialist', () => ({
  executeSubtask: vi.fn(),
}));

vi.mock('@/lib/payments/escrow', () => ({
  createEscrow: vi.fn(),
  releaseEscrow: vi.fn(),
  refundEscrow: vi.fn(),
}));

vi.mock('@/lib/contracts/forbaEscrow', () => ({
  createOnChainEscrow: vi.fn(),
  releaseOnChainEscrow: vi.fn(),
  refundOnChainEscrow: vi.fn(),
}));

vi.mock('@/lib/events/emitter', () => ({
  emitter: { emit: vi.fn() },
}));

vi.mock('@/lib/payments/uniswap', () => ({
  attemptPostPaymentSwap: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/llm/simulator', () => ({
  isSimulationMode: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/agents/registry', () => ({
  discoverAgents: vi.fn(),
  selectBestAgent: vi.fn(),
}));

// ── Imports after mocks ────────────────────────────────────────────────────

import { executeTask } from '@/lib/agents/orchestrator';
import { store } from '@/lib/store';
import { llmCall, parseJSON } from '@/lib/llm/client';
import { evaluateDeliverable } from '@/lib/llm/evaluator';
import { executeSubtask } from '@/lib/agents/specialist';
import { createEscrow, releaseEscrow, refundEscrow } from '@/lib/payments/escrow';
import { createOnChainEscrow, releaseOnChainEscrow, refundOnChainEscrow } from '@/lib/contracts/forbaEscrow';
import { emitter } from '@/lib/events/emitter';
import { discoverAgents, selectBestAgent } from '@/lib/agents/registry';
import type { Agent } from '@/lib/types';

// ── Typed mock references ──────────────────────────────────────────────────

const mockLlmCall = vi.mocked(llmCall);
const mockParseJSON = vi.mocked(parseJSON);
const mockEvaluate = vi.mocked(evaluateDeliverable);
const mockExecSubtask = vi.mocked(executeSubtask);
const mockCreateEscrow = vi.mocked(createEscrow);
const mockReleaseEscrow = vi.mocked(releaseEscrow);
const mockRefundEscrow = vi.mocked(refundEscrow);
const mockCreateOnChain = vi.mocked(createOnChainEscrow);
const mockReleaseOnChain = vi.mocked(releaseOnChainEscrow);
const mockRefundOnChain = vi.mocked(refundOnChainEscrow);
const mockEmit = vi.mocked(emitter.emit);
const mockDiscover = vi.mocked(discoverAgents);
const mockSelectBest = vi.mocked(selectBestAgent);

// ── Shared JSON payloads ───────────────────────────────────────────────────

const DECOMPOSE_JSON = JSON.stringify({
  subtasks: [{ description: 'Write code', type: 'code', estimatedComplexity: 'low' }],
  reasoning: 'single subtask',
});

const COMPILE_JSON = JSON.stringify({
  finalResult: 'Compiled output',
  summary: 'Done',
});

// ── Helpers ────────────────────────────────────────────────────────────────

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'agent-1',
    name: 'CodeSmith',
    type: 'code',
    description: 'Coder',
    capabilities: ['typescript'],
    pricing: 0.05,
    locusApiKey: 'mock-agent-key',
    locusWalletId: 'mock-wallet',
    locusOwnerAddress: '0xAGENT',
    preferredToken: 'USDC',
    status: 'idle',
    totalEarnings: 0,
    tasksCompleted: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeLocusEscrow(id = 'escrow-1') {
  return {
    id,
    taskId: 'task-x',
    subtaskId: 'sub-x',
    clientAgentId: 'orchestrator',
    providerAgentId: 'agent-1',
    clientAddress: '0x0000000000000000000000000000000000000000',
    providerAddress: '0xAGENT',
    amount: 0.05,
    status: 'created' as const,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Wire up defaults for a passing single-subtask run.
 * Registers the agent in store so store.updateAgent('agent-1', ...) works.
 */
function setupHappyPath(agentOverrides: Partial<Agent> = {}): Agent {
  const agent = makeAgent(agentOverrides);
  store.registerAgent(agent);

  mockDiscover.mockReturnValue([agent]);
  mockSelectBest.mockReturnValue(agent);

  mockLlmCall
    .mockResolvedValueOnce(DECOMPOSE_JSON)
    .mockResolvedValueOnce(COMPILE_JSON);

  mockExecSubtask.mockResolvedValue('Great code output');
  mockEvaluate.mockResolvedValue({ passed: true, score: 90, reasoning: 'Excellent' });

  mockCreateEscrow.mockResolvedValue(makeLocusEscrow());
  mockReleaseEscrow.mockResolvedValue(undefined);

  return agent;
}

// ── Lifecycle ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  store.reset();
  vi.unstubAllEnvs();
  // Restore parseJSON to pass-through after clearAllMocks resets it
  mockParseJSON.mockImplementation((raw: string) => JSON.parse(raw));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ── executeTask — task not found ───────────────────────────────────────────

describe('executeTask() — task not found', () => {
  it('throws when task does not exist in store', async () => {
    await expect(executeTask('nonexistent-id')).rejects.toThrow('Task not found: nonexistent-id');
  });
});

// ── executeTask — happy path ───────────────────────────────────────────────

describe('executeTask() — full happy path', () => {
  it('marks task as completed when subtask passes evaluation', async () => {
    setupHappyPath();
    const task = store.createTask('Build a landing page');

    await executeTask(task.id);

    const updated = store.getTask(task.id);
    expect(updated?.status).toBe('completed');
    expect(updated?.finalResult).toBe('Compiled output');
  });

  it('emits task:decomposed event after decomposition', async () => {
    setupHappyPath();
    const task = store.createTask('Build a landing page');

    await executeTask(task.id);

    const types = mockEmit.mock.calls.map(([t]) => t);
    expect(types).toContain('task:decomposed');
  });

  it('emits task:completed event on success', async () => {
    setupHappyPath();
    const task = store.createTask('Build a landing page');

    await executeTask(task.id);

    const types = mockEmit.mock.calls.map(([t]) => t);
    expect(types).toContain('task:completed');
  });

  it('emits agent:hired event for each subtask', async () => {
    setupHappyPath();
    const task = store.createTask('Build a landing page');

    await executeTask(task.id);

    const types = mockEmit.mock.calls.map(([t]) => t);
    expect(types).toContain('agent:hired');
  });

  it('emits evaluation:passed when deliverable passes', async () => {
    setupHappyPath();
    const task = store.createTask('Build a landing page');

    await executeTask(task.id);

    const types = mockEmit.mock.calls.map(([t]) => t);
    expect(types).toContain('evaluation:passed');
  });

  it('emits escrow:released after passing evaluation', async () => {
    setupHappyPath();
    const task = store.createTask('Build something');

    await executeTask(task.id);

    const types = mockEmit.mock.calls.map(([t]) => t);
    expect(types).toContain('escrow:released');
  });

  it('calls releaseEscrow when Locus escrow was created', async () => {
    setupHappyPath();
    const task = store.createTask('Build something');

    await executeTask(task.id);

    expect(mockReleaseEscrow).toHaveBeenCalledWith('escrow-1', expect.any(String));
  });

  it('updates agent totalEarnings after passing evaluation', async () => {
    const agent = setupHappyPath();
    const task = store.createTask('Build something');

    await executeTask(task.id);

    const updatedAgent = store.getAgent('agent-1');
    expect(updatedAgent?.totalEarnings).toBe(agent.pricing);
  });

  it('calls executeSubtask with agent and subtask', async () => {
    setupHappyPath();
    const task = store.createTask('Build something');

    await executeTask(task.id);

    expect(mockExecSubtask).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: expect.objectContaining({ id: 'agent-1' }),
        taskDescription: 'Build something',
      })
    );
  });

  it('emits evaluation:started before evaluating deliverable', async () => {
    setupHappyPath();
    const task = store.createTask('Build something');

    await executeTask(task.id);

    const types = mockEmit.mock.calls.map(([t]) => t);
    expect(types).toContain('evaluation:started');
  });
});

// ── executeTask — escrow creation ─────────────────────────────────────────

describe('executeTask() — escrow creation', () => {
  it('calls createEscrow with correct params when no on-chain env', async () => {
    setupHappyPath();
    const task = store.createTask('Build something');

    await executeTask(task.id);

    expect(mockCreateEscrow).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: task.id,
        providerAgentId: 'agent-1',
        amount: 0.05,
      })
    );
  });

  it('does not call createOnChainEscrow when env vars not set', async () => {
    setupHappyPath();
    const task = store.createTask('Build something');

    await executeTask(task.id);

    expect(mockCreateOnChain).not.toHaveBeenCalled();
  });

  it('calls createOnChainEscrow when both env vars are set', async () => {
    vi.stubEnv('NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS', '0xCONTRACT');
    vi.stubEnv('DEPLOYER_PRIVATE_KEY', '0xPRIVATEKEY');

    setupHappyPath();
    mockCreateOnChain.mockResolvedValue({ txHash: '0xONCHAIN', escrowIdBytes32: '0xBYTES' });
    mockReleaseOnChain.mockResolvedValue({ txHash: '0xRELEASED' });

    const task = store.createTask('On-chain task');

    await executeTask(task.id);

    expect(mockCreateOnChain).toHaveBeenCalled();
  });

  it('falls back to Locus escrow when on-chain escrow fails', async () => {
    vi.stubEnv('NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS', '0xCONTRACT');
    vi.stubEnv('DEPLOYER_PRIVATE_KEY', '0xPRIVATEKEY');

    setupHappyPath();
    mockCreateOnChain.mockRejectedValue(new Error('on-chain failed'));

    const task = store.createTask('On-chain task with fallback');

    await executeTask(task.id);

    expect(mockCreateEscrow).toHaveBeenCalled();
  });

  it('emits simulated escrow:created when Locus escrow also fails', async () => {
    setupHappyPath();
    mockCreateEscrow.mockRejectedValue(new Error('locus escrow failed'));

    const task = store.createTask('No escrow task');

    await executeTask(task.id);

    const types = mockEmit.mock.calls.map(([t]) => t);
    expect(types).toContain('escrow:created');
  });
});

// ── executeTask — evaluation failure ──────────────────────────────────────

describe('executeTask() — evaluation failure', () => {
  it('refunds Locus escrow when evaluation fails after all retries', async () => {
    const agent = makeAgent();
    store.registerAgent(agent);
    mockDiscover.mockReturnValue([agent]);
    mockSelectBest.mockReturnValue(agent);

    mockLlmCall.mockResolvedValue(DECOMPOSE_JSON);
    mockExecSubtask.mockResolvedValue('poor output');
    mockEvaluate.mockResolvedValue({ passed: false, score: 20, reasoning: 'Too bad' });
    mockCreateEscrow.mockResolvedValue(makeLocusEscrow('escrow-fail'));

    const task = store.createTask('Failing task');

    await executeTask(task.id);

    expect(mockRefundEscrow).toHaveBeenCalled();
  });

  it('emits evaluation:failed event when deliverable is rejected', async () => {
    const agent = makeAgent();
    store.registerAgent(agent);
    mockDiscover.mockReturnValue([agent]);
    mockSelectBest.mockReturnValue(agent);

    mockLlmCall.mockResolvedValue(DECOMPOSE_JSON);
    mockExecSubtask.mockResolvedValue('poor output');
    mockEvaluate.mockResolvedValue({ passed: false, score: 20, reasoning: 'Too bad' });
    mockCreateEscrow.mockRejectedValue(new Error('no escrow'));

    const task = store.createTask('Failing task 2');

    await executeTask(task.id);

    const types = mockEmit.mock.calls.map(([t]) => t);
    expect(types).toContain('evaluation:failed');
  });

  it('marks task as failed when all subtasks fail', async () => {
    const agent = makeAgent();
    store.registerAgent(agent);
    mockDiscover.mockReturnValue([agent]);
    mockSelectBest.mockReturnValue(agent);

    mockLlmCall.mockResolvedValue(DECOMPOSE_JSON);
    mockExecSubtask.mockResolvedValue('poor');
    mockEvaluate.mockResolvedValue({ passed: false, score: 10, reasoning: 'Nope' });
    mockCreateEscrow.mockRejectedValue(new Error('skip'));

    const task = store.createTask('Doomed task');

    await executeTask(task.id);

    expect(store.getTask(task.id)?.status).toBe('failed');
  });

  it('emits task:failed when all subtasks fail', async () => {
    const agent = makeAgent();
    store.registerAgent(agent);
    mockDiscover.mockReturnValue([agent]);
    mockSelectBest.mockReturnValue(agent);

    mockLlmCall.mockResolvedValue(DECOMPOSE_JSON);
    mockExecSubtask.mockResolvedValue('poor');
    mockEvaluate.mockResolvedValue({ passed: false, score: 10, reasoning: 'Nope' });
    mockCreateEscrow.mockRejectedValue(new Error('skip'));

    const task = store.createTask('Doomed task 2');

    await executeTask(task.id);

    const types = mockEmit.mock.calls.map(([t]) => t);
    expect(types).toContain('task:failed');
  });
});

// ── executeTask — decomposition failure ───────────────────────────────────

describe('executeTask() — decomposition failure', () => {
  it('marks task as failed when LLM decomposition throws', async () => {
    mockLlmCall.mockRejectedValue(new Error('LLM unavailable'));

    const task = store.createTask('Crash task');

    await executeTask(task.id);

    expect(store.getTask(task.id)?.status).toBe('failed');
  });

  it('emits task:failed when decomposition throws', async () => {
    mockLlmCall.mockRejectedValue(new Error('LLM unavailable'));

    const task = store.createTask('Crash task 2');

    await executeTask(task.id);

    const types = mockEmit.mock.calls.map(([t]) => t);
    expect(types).toContain('task:failed');
  });
});

// ── executeTask — no agents available ─────────────────────────────────────

describe('executeTask() — no agents available', () => {
  it('marks task as failed when discoverAgents returns empty', async () => {
    mockDiscover.mockReturnValue([]);
    mockSelectBest.mockReturnValue(null);
    mockLlmCall.mockResolvedValue(DECOMPOSE_JSON);

    const task = store.createTask('No agents task');

    await executeTask(task.id);

    expect(store.getTask(task.id)?.status).toBe('failed');
  });
});

// ── getOrchestratorApiKey — priority order ────────────────────────────────

describe('getOrchestratorApiKey() — priority order', () => {
  it('uses LOCUS_ORCHESTRATOR_API_KEY when set to a real (non-mock) key', async () => {
    vi.stubEnv('LOCUS_ORCHESTRATOR_API_KEY', 'real-orchestrator-key');

    setupHappyPath();
    const task = store.createTask('Priority test');

    await executeTask(task.id);

    expect(mockLlmCall).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'real-orchestrator-key' })
    );
  });

  it('falls back to LOCUS_API_KEY when orchestrator key starts with mock-', async () => {
    vi.stubEnv('LOCUS_ORCHESTRATOR_API_KEY', 'mock-orch');
    vi.stubEnv('LOCUS_API_KEY', 'real-locus-key');

    setupHappyPath();
    const task = store.createTask('Priority test 2');

    await executeTask(task.id);

    expect(mockLlmCall).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'real-locus-key' })
    );
  });

  it('falls back to mock-orchestrator-key when no real keys exist', async () => {
    vi.stubEnv('LOCUS_ORCHESTRATOR_API_KEY', '');
    vi.stubEnv('LOCUS_API_KEY', '');

    setupHappyPath();
    const task = store.createTask('Mock key test');

    await executeTask(task.id);

    expect(mockLlmCall).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'mock-orchestrator-key' })
    );
  });

  it('uses first real agent key when env keys start with mock-', async () => {
    vi.stubEnv('LOCUS_ORCHESTRATOR_API_KEY', 'mock-orch');
    vi.stubEnv('LOCUS_API_KEY', 'mock-locus');

    // Register an agent with a real key BEFORE setupHappyPath so it comes first
    store.registerAgent(makeAgent({ id: 'ag-real', locusApiKey: 'agent-real-key' }));

    setupHappyPath();
    const task = store.createTask('Agent key test');

    await executeTask(task.id);

    expect(mockLlmCall).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'agent-real-key' })
    );
  });
});

// ── executeTask — on-chain escrow paths ───────────────────────────────────

describe('executeTask() — on-chain escrow paths', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS', '0xCONTRACT');
    vi.stubEnv('DEPLOYER_PRIVATE_KEY', '0xPRIVATEKEY');
  });

  it('calls releaseOnChainEscrow when on-chain escrow created and evaluation passes', async () => {
    setupHappyPath();
    mockCreateOnChain.mockResolvedValue({ txHash: '0xONCHAIN', escrowIdBytes32: '0xBYTES' });
    mockReleaseOnChain.mockResolvedValue({ txHash: '0xRELEASED' });

    const task = store.createTask('On-chain release task');

    await executeTask(task.id);

    expect(mockReleaseOnChain).toHaveBeenCalled();
  });

  it('calls refundOnChainEscrow when on-chain escrow created and evaluation fails', async () => {
    const agent = makeAgent();
    store.registerAgent(agent);
    mockDiscover.mockReturnValue([agent]);
    mockSelectBest.mockReturnValue(agent);

    mockLlmCall.mockResolvedValue(DECOMPOSE_JSON);
    mockExecSubtask.mockResolvedValue('bad output');
    mockEvaluate.mockResolvedValue({ passed: false, score: 10, reasoning: 'Bad' });
    mockCreateOnChain.mockResolvedValue({ txHash: '0xONCHAIN', escrowIdBytes32: '0xBYTES' });
    mockRefundOnChain.mockResolvedValue({ txHash: '0xREFUNDED' });

    const task = store.createTask('On-chain refund task');

    await executeTask(task.id);

    expect(mockRefundOnChain).toHaveBeenCalled();
  });

  it('emits escrow:released with onChain:true after on-chain release', async () => {
    setupHappyPath();
    mockCreateOnChain.mockResolvedValue({ txHash: '0xONCHAIN', escrowIdBytes32: '0xBYTES' });
    mockReleaseOnChain.mockResolvedValue({ txHash: '0xRELEASED' });

    const task = store.createTask('On-chain emit task');

    await executeTask(task.id);

    const releaseCalls = mockEmit.mock.calls.filter(([t]) => t === 'escrow:released');
    expect(releaseCalls.length).toBeGreaterThan(0);
    const releasePayload = releaseCalls[0][1] as { data?: { onChain?: boolean } };
    expect(releasePayload?.data?.onChain).toBe(true);
  });
});

// ── executeTask — multiple subtasks ───────────────────────────────────────

describe('executeTask() — multiple subtasks', () => {
  it('executes all subtasks and compiles final result', async () => {
    const agent = makeAgent();
    store.registerAgent(agent);
    mockDiscover.mockReturnValue([agent]);
    mockSelectBest.mockReturnValue(agent);

    const multiDecompose = JSON.stringify({
      subtasks: [
        { description: 'Research topic', type: 'research', estimatedComplexity: 'low' },
        { description: 'Write code', type: 'code', estimatedComplexity: 'medium' },
      ],
      reasoning: 'two subtasks',
    });

    mockLlmCall
      .mockResolvedValueOnce(multiDecompose)
      .mockResolvedValueOnce(COMPILE_JSON);

    mockExecSubtask.mockResolvedValue('deliverable');
    mockEvaluate.mockResolvedValue({ passed: true, score: 80, reasoning: 'Good' });
    mockCreateEscrow.mockResolvedValue(makeLocusEscrow('escrow-multi'));
    mockReleaseEscrow.mockResolvedValue(undefined);

    const task = store.createTask('Multi-subtask task');

    await executeTask(task.id);

    expect(mockExecSubtask).toHaveBeenCalledTimes(2);
    expect(store.getTask(task.id)?.status).toBe('completed');
    expect(store.getTask(task.id)?.finalResult).toBe('Compiled output');
  });

  it('completes partially when one subtask fails and another passes', async () => {
    const agent = makeAgent();
    store.registerAgent(agent);
    mockDiscover.mockReturnValue([agent]);
    mockSelectBest.mockReturnValue(agent);

    const multiDecompose = JSON.stringify({
      subtasks: [
        { description: 'Failing subtask', type: 'research', estimatedComplexity: 'low' },
        { description: 'Passing subtask', type: 'code', estimatedComplexity: 'low' },
      ],
      reasoning: 'mixed',
    });

    mockLlmCall
      .mockResolvedValueOnce(multiDecompose)
      .mockResolvedValueOnce(COMPILE_JSON);

    mockExecSubtask.mockResolvedValue('deliverable');
    // First subtask fails both attempts (MAX_RETRIES=1), second passes
    mockEvaluate
      .mockResolvedValueOnce({ passed: false, score: 10, reasoning: 'Bad' })
      .mockResolvedValueOnce({ passed: false, score: 10, reasoning: 'Bad again' })
      .mockResolvedValueOnce({ passed: true, score: 90, reasoning: 'Good' });
    mockCreateEscrow.mockRejectedValue(new Error('skip escrow'));

    const task = store.createTask('Partial success task');

    await executeTask(task.id);

    expect(store.getTask(task.id)?.status).toBe('completed');
  });
});
