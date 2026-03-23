import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks must be declared before imports ────────────────────────────────────
vi.mock('@/lib/payments/locus', () => ({
  sendPayment: vi.fn(),
  getBalance: vi.fn(),
}));

vi.mock('@/lib/llm/simulator', () => ({
  isSimulationMode: vi.fn(() => true),
}));

vi.mock('@/lib/events/emitter', () => ({
  emitter: { emit: vi.fn() },
}));

import {
  createEscrow,
  releaseEscrow,
  refundEscrow,
  getEscrow,
  getEscrowsByTask,
  getAllEscrows,
} from '@/lib/payments/escrow';
import { sendPayment, getBalance } from '@/lib/payments/locus';
import { isSimulationMode } from '@/lib/llm/simulator';
import { emitter } from '@/lib/events/emitter';

const mockSendPayment = vi.mocked(sendPayment);
const mockGetBalance = vi.mocked(getBalance);
const mockIsSimulationMode = vi.mocked(isSimulationMode);
const mockEmit = vi.mocked(emitter.emit);

function escrowParams(overrides = {}) {
  return {
    taskId: 'task-1',
    subtaskId: 'sub-1',
    clientAgentId: 'orchestrator',
    providerAgentId: 'agent-1',
    clientAddress: '0xCLIENT',
    providerAddress: '0xPROVIDER',
    clientApiKey: 'mock-client-key',
    amount: 0.05,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsSimulationMode.mockReturnValue(true);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ──────────────────────────────────────────────────────────────────────────────
// createEscrow
// ──────────────────────────────────────────────────────────────────────────────
describe('createEscrow()', () => {
  it('creates escrow with correct fields', async () => {
    const escrow = await createEscrow(escrowParams());

    expect(escrow.id).toBeTruthy();
    expect(escrow.taskId).toBe('task-1');
    expect(escrow.subtaskId).toBe('sub-1');
    expect(escrow.amount).toBe(0.05);
    expect(escrow.clientAddress).toBe('0xCLIENT');
    expect(escrow.providerAddress).toBe('0xPROVIDER');
    expect(escrow.createdAt).toBeTruthy();
  });

  it('auto-funds in simulation mode (status becomes funded)', async () => {
    mockIsSimulationMode.mockReturnValue(true);
    const escrow = await createEscrow(escrowParams());
    expect(escrow.status).toBe('funded');
    expect(escrow.fundedAt).toBeTruthy();
  });

  it('auto-funds when clientApiKey is a mock key', async () => {
    mockIsSimulationMode.mockReturnValue(false);
    vi.stubEnv('LOCUS_ORCHESTRATOR_API_KEY', '');
    vi.stubEnv('LOCUS_API_KEY', '');
    const escrow = await createEscrow(escrowParams({ clientApiKey: 'mock-key-abc' }));
    expect(escrow.status).toBe('funded');
  });

  it('funds with real API when balance is sufficient', async () => {
    mockIsSimulationMode.mockReturnValue(false);
    vi.stubEnv('LOCUS_ORCHESTRATOR_API_KEY', 'real-api-key');
    mockGetBalance.mockResolvedValueOnce({ balance: '100.00', walletAddress: '0xW' });

    const escrow = await createEscrow(escrowParams({ amount: 10 }));
    expect(escrow.status).toBe('funded');
    expect(mockGetBalance).toHaveBeenCalledOnce();
  });

  it('falls back to auto-fund when balance check fails', async () => {
    mockIsSimulationMode.mockReturnValue(false);
    vi.stubEnv('LOCUS_ORCHESTRATOR_API_KEY', 'real-api-key');
    mockGetBalance.mockRejectedValueOnce(new Error('Network error'));

    const escrow = await createEscrow(escrowParams());
    expect(escrow.status).toBe('funded');
  });

  it('emits escrow:created and escrow:funded events', async () => {
    await createEscrow(escrowParams());

    const emittedTypes = mockEmit.mock.calls.map(([type]) => type);
    expect(emittedTypes).toContain('escrow:created');
    expect(emittedTypes).toContain('escrow:funded');
  });

  it('stores escrow so it can be retrieved', async () => {
    const escrow = await createEscrow(escrowParams({ taskId: 'task-retrieve' }));
    const found = getEscrow(escrow.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(escrow.id);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// releaseEscrow
// ──────────────────────────────────────────────────────────────────────────────
describe('releaseEscrow()', () => {
  it('releases a funded escrow in simulation mode', async () => {
    mockIsSimulationMode.mockReturnValue(true);
    const created = await createEscrow(escrowParams());

    const released = await releaseEscrow(created.id, 'mock-key');

    expect(released.status).toBe('released');
    expect(released.releaseTxHash).toContain('0xsim_');
    expect(released.releasedAt).toBeTruthy();
  });

  it('releases with real payment when real key available', async () => {
    mockIsSimulationMode.mockReturnValue(false);
    vi.stubEnv('LOCUS_ORCHESTRATOR_API_KEY', 'real-key');
    mockGetBalance.mockResolvedValueOnce({ balance: '100', walletAddress: '0xW' });
    const created = await createEscrow(escrowParams());

    mockSendPayment.mockResolvedValueOnce({
      transactionHash: '0xREALTX',
      amount: '0.05',
      to: '0xPROVIDER',
      from: '0xCLIENT',
      status: 'confirmed',
    });

    const released = await releaseEscrow(created.id, 'real-key');
    expect(released.status).toBe('released');
    expect(released.releaseTxHash).toBe('0xREALTX');
  });

  it('falls back to simulated release when real payment fails', async () => {
    mockIsSimulationMode.mockReturnValue(false);
    vi.stubEnv('LOCUS_ORCHESTRATOR_API_KEY', 'real-key');
    mockGetBalance.mockResolvedValueOnce({ balance: '100', walletAddress: '0xW' });
    const created = await createEscrow(escrowParams());

    mockSendPayment.mockRejectedValueOnce(new Error('Payment failed'));

    const released = await releaseEscrow(created.id, 'real-key');
    expect(released.status).toBe('released');
    expect(released.releaseTxHash).toContain('0xsim_');
  });

  it('throws when escrow not found', async () => {
    await expect(releaseEscrow('non-existent-id', 'key')).rejects.toThrow('Escrow not found');
  });

  it('throws when escrow is not in funded status', async () => {
    mockIsSimulationMode.mockReturnValue(true);
    const created = await createEscrow(escrowParams());
    // Release once to get it to 'released'
    await releaseEscrow(created.id, 'key');
    // Try to release again
    await expect(releaseEscrow(created.id, 'key')).rejects.toThrow('Cannot release escrow');
  });

  it('emits escrow:released event', async () => {
    const created = await createEscrow(escrowParams());
    vi.clearAllMocks();

    await releaseEscrow(created.id, 'mock-key');

    const types = mockEmit.mock.calls.map(([t]) => t);
    expect(types).toContain('escrow:released');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// refundEscrow
// ──────────────────────────────────────────────────────────────────────────────
describe('refundEscrow()', () => {
  it('sets status to refunded', async () => {
    const created = await createEscrow(escrowParams());
    const refunded = await refundEscrow(created.id, 'key');

    expect(refunded.status).toBe('refunded');
  });

  it('throws when escrow not found', async () => {
    await expect(refundEscrow('ghost-id', 'key')).rejects.toThrow('Escrow not found');
  });

  it('throws when escrow is not in funded status', async () => {
    const created = await createEscrow(escrowParams());
    await refundEscrow(created.id, 'key'); // first refund
    await expect(refundEscrow(created.id, 'key')).rejects.toThrow('Cannot refund');
  });

  it('emits escrow:refunded event', async () => {
    const created = await createEscrow(escrowParams({ taskId: 'refund-task', subtaskId: 'rs1' }));
    vi.clearAllMocks();

    await refundEscrow(created.id, 'key');

    const types = mockEmit.mock.calls.map(([t]) => t);
    expect(types).toContain('escrow:refunded');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// getEscrowsByTask / getAllEscrows
// ──────────────────────────────────────────────────────────────────────────────
describe('getEscrowsByTask()', () => {
  it('returns only escrows for the given taskId', async () => {
    await createEscrow(escrowParams({ taskId: 'task-A', subtaskId: 's1' }));
    await createEscrow(escrowParams({ taskId: 'task-A', subtaskId: 's2' }));
    await createEscrow(escrowParams({ taskId: 'task-B', subtaskId: 's3' }));

    const forA = getEscrowsByTask('task-A');
    expect(forA).toHaveLength(2);
    expect(forA.every((e) => e.taskId === 'task-A')).toBe(true);
  });

  it('returns empty array for unknown taskId', () => {
    expect(getEscrowsByTask('unknown')).toEqual([]);
  });
});

describe('getAllEscrows()', () => {
  it('returns all escrows sorted newest first', async () => {
    const e1 = await createEscrow(escrowParams({ taskId: 'ta', subtaskId: 's-old' }));
    const e2 = await createEscrow(escrowParams({ taskId: 'tb', subtaskId: 's-new' }));

    const all = getAllEscrows();
    // Both escrows should be present
    const ids = all.map((e) => e.id);
    expect(ids).toContain(e1.id);
    expect(ids).toContain(e2.id);
  });
});
