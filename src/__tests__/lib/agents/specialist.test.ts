import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/llm/client', () => ({
  llmCall: vi.fn(),
  parseJSON: (raw: string) => JSON.parse(raw),
}));

vi.mock('@/lib/events/emitter', () => ({
  emitter: { emit: vi.fn() },
}));

vi.mock('@/lib/store', () => ({
  store: {
    updateAgent: vi.fn(),
    getAgent: vi.fn(),
  },
}));

import { executeSubtask } from '@/lib/agents/specialist';
import { llmCall } from '@/lib/llm/client';
import { emitter } from '@/lib/events/emitter';
import { store } from '@/lib/store';
import type { Agent, Subtask } from '@/lib/types';

const mockLlmCall = vi.mocked(llmCall);
const mockEmit = vi.mocked(emitter.emit);
const mockUpdateAgent = vi.mocked(store.updateAgent);

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'agent-1',
    name: 'CodeSmith',
    type: 'code',
    description: 'Coder',
    capabilities: ['typescript'],
    pricing: 0.05,
    locusApiKey: 'mock-key',
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

function makeSubtask(overrides: Partial<Subtask> = {}): Subtask {
  return {
    id: 'sub-1',
    taskId: 'task-1',
    description: 'Build a button component',
    type: 'code',
    status: 'in_progress',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ──────────────────────────────────────────────────────────────────────────────
// executeSubtask
// ──────────────────────────────────────────────────────────────────────────────
describe('executeSubtask()', () => {
  it('returns the deliverable from LLM response', async () => {
    mockLlmCall.mockResolvedValueOnce(
      JSON.stringify({ deliverable: 'const Button = () => <button/>;', summary: 'React component' })
    );

    const result = await executeSubtask({
      agent: makeAgent(),
      subtask: makeSubtask({ type: 'code' }),
      taskDescription: 'Build a UI',
    });

    expect(result).toBe('const Button = () => <button/>;');
  });

  it('updates agent status to working then back to idle', async () => {
    mockLlmCall.mockResolvedValueOnce(
      JSON.stringify({ deliverable: 'output', summary: 'done' })
    );

    await executeSubtask({
      agent: makeAgent({ id: 'ag-1' }),
      subtask: makeSubtask(),
      taskDescription: 'task',
    });

    // First call: working
    expect(mockUpdateAgent).toHaveBeenCalledWith('ag-1', { status: 'working' });
    // Second call: idle with incremented tasksCompleted
    expect(mockUpdateAgent).toHaveBeenCalledWith('ag-1', {
      status: 'idle',
      tasksCompleted: 1,
    });
  });

  it('emits agent:working and agent:delivered events on success', async () => {
    mockLlmCall.mockResolvedValueOnce(
      JSON.stringify({ deliverable: 'result', summary: 'delivered' })
    );

    await executeSubtask({
      agent: makeAgent(),
      subtask: makeSubtask(),
      taskDescription: 'task desc',
    });

    const emittedTypes = mockEmit.mock.calls.map(([type]) => type);
    expect(emittedTypes).toContain('agent:working');
    expect(emittedTypes).toContain('agent:delivered');
  });

  it('resets agent status to idle and emits system:error on failure', async () => {
    mockLlmCall.mockRejectedValueOnce(new Error('LLM timeout'));

    await expect(
      executeSubtask({
        agent: makeAgent({ id: 'ag-fail' }),
        subtask: makeSubtask(),
        taskDescription: 'task',
      })
    ).rejects.toThrow('LLM timeout');

    expect(mockUpdateAgent).toHaveBeenCalledWith('ag-fail', { status: 'idle' });
    const emittedTypes = mockEmit.mock.calls.map(([type]) => type);
    expect(emittedTypes).toContain('system:error');
  });

  it('handles research subtask type', async () => {
    mockLlmCall.mockResolvedValueOnce(
      JSON.stringify({ deliverable: '# Research Report\nKey findings...', summary: 'Research done' })
    );

    const result = await executeSubtask({
      agent: makeAgent({ type: 'research' }),
      subtask: makeSubtask({ type: 'research', description: 'Research AI trends' }),
      taskDescription: 'market analysis',
    });

    expect(result).toContain('Research Report');
  });

  it('handles copy subtask type', async () => {
    mockLlmCall.mockResolvedValueOnce(
      JSON.stringify({ deliverable: 'Transform Your Business with AI!', summary: 'Marketing copy' })
    );

    const result = await executeSubtask({
      agent: makeAgent({ type: 'copy' }),
      subtask: makeSubtask({ type: 'copy', description: 'Write marketing copy' }),
      taskDescription: 'product launch',
    });

    expect(result).toBe('Transform Your Business with AI!');
  });

  it('uses real orchestrator API key over agent mock key', async () => {
    vi.stubEnv('LOCUS_ORCHESTRATOR_API_KEY', 'real-orch-key');
    mockLlmCall.mockResolvedValueOnce(
      JSON.stringify({ deliverable: 'out', summary: 'done' })
    );

    await executeSubtask({
      agent: makeAgent({ locusApiKey: 'mock-agent-key' }),
      subtask: makeSubtask(),
      taskDescription: 'task',
    });

    // llmCall should be called with real orchestrator key
    expect(mockLlmCall).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'real-orch-key' })
    );

    vi.unstubAllEnvs();
  });
});
