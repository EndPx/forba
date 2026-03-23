import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoist mock objects so they are available inside vi.mock factory ────────

const {
  mockWait,
  mockApproveTx,
  mockCreateTx,
  mockReleaseTx,
  mockRefundTx,
  mockUsdc,
  mockEscrowContract,
} = vi.hoisted(() => {
  const mockWait = vi.fn().mockResolvedValue(undefined);
  const mockApproveTx = { hash: '0xAPPROVE', wait: mockWait };
  const mockCreateTx = { hash: '0xCREATE', wait: mockWait };
  const mockReleaseTx = { hash: '0xRELEASE', wait: mockWait };
  const mockRefundTx = { hash: '0xREFUND', wait: mockWait };

  const mockUsdc = {
    allowance: vi.fn().mockResolvedValue(0n),
    approve: vi.fn().mockResolvedValue(mockApproveTx),
    balanceOf: vi.fn().mockResolvedValue(100_000_000n),
  };

  const mockEscrowContract = {
    createEscrow: vi.fn().mockResolvedValue(mockCreateTx),
    releaseEscrow: vi.fn().mockResolvedValue(mockReleaseTx),
    refundEscrow: vi.fn().mockResolvedValue(mockRefundTx),
    getEscrow: vi.fn().mockResolvedValue([
      '0xPAYER', '0xPAYEE', 5_000_000n, 0n, 1_700_000_000n,
    ]),
    getEscrowCount: vi.fn().mockResolvedValue(5n),
    getContractBalance: vi.fn().mockResolvedValue(50_000_000n),
  };

  return {
    mockWait,
    mockApproveTx,
    mockCreateTx,
    mockReleaseTx,
    mockRefundTx,
    mockUsdc,
    mockEscrowContract,
  };
});

// ── Mock ethers — all three are called with `new` so need function ctors ──

vi.mock('ethers', () => {
  const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

  // Must be regular functions (not arrows) to work as constructors with `new`
  function MockJsonRpcProvider() {
    return {};
  }

  function MockWallet() {
    return { address: '0xWALLET' };
  }

  function MockContract(address: string) {
    if (address === USDC_ADDRESS) return mockUsdc;
    return mockEscrowContract;
  }

  return {
    ethers: {
      JsonRpcProvider: MockJsonRpcProvider,
      Wallet: MockWallet,
      Contract: MockContract,
      Network: { from: () => ({}) },
      id: (s: string) => `0xhash_${s}`,
      ZeroAddress: '0x0000000000000000000000000000000000000000',
    },
  };
});

// ── Imports after mocks ────────────────────────────────────────────────────

import {
  createOnChainEscrow,
  releaseOnChainEscrow,
  refundOnChainEscrow,
  getOnChainEscrow,
  getContractStats,
  getBaseScanTxUrl,
  getBaseScanContractUrl,
} from '@/lib/contracts/forbaEscrow';

// ── Lifecycle ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockWait.mockResolvedValue(undefined);
  mockUsdc.allowance.mockResolvedValue(0n);
  mockUsdc.approve.mockResolvedValue(mockApproveTx);
  mockEscrowContract.createEscrow.mockResolvedValue(mockCreateTx);
  mockEscrowContract.releaseEscrow.mockResolvedValue(mockReleaseTx);
  mockEscrowContract.refundEscrow.mockResolvedValue(mockRefundTx);
  mockEscrowContract.getEscrow.mockResolvedValue([
    '0xPAYER', '0xPAYEE', 5_000_000n, 0n, 1_700_000_000n,
  ]);
  mockEscrowContract.getEscrowCount.mockResolvedValue(5n);
  mockEscrowContract.getContractBalance.mockResolvedValue(50_000_000n);
  // MockContract is a plain function (not a vi.fn), so no restoration needed —
  // it always routes by address using the hoisted mock objects above.
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ── getBaseScanTxUrl ───────────────────────────────────────────────────────

describe('getBaseScanTxUrl()', () => {
  it('returns correct BaseScan URL for a tx hash', () => {
    expect(getBaseScanTxUrl('0xABC123')).toBe('https://sepolia.basescan.org/tx/0xABC123');
  });

  it('handles long hashes', () => {
    const hash = '0x' + 'f'.repeat(64);
    expect(getBaseScanTxUrl(hash)).toBe(`https://sepolia.basescan.org/tx/${hash}`);
  });
});

// ── getBaseScanContractUrl ─────────────────────────────────────────────────

describe('getBaseScanContractUrl()', () => {
  it('returns URL with contract address from env', () => {
    vi.stubEnv('NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS', '0xCONTRACT');
    const url = getBaseScanContractUrl();
    expect(url).toBe('https://sepolia.basescan.org/address/0xCONTRACT');
  });

  it('returns URL with empty address when env not set', () => {
    vi.stubEnv('NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS', '');
    expect(getBaseScanContractUrl()).toBe('https://sepolia.basescan.org/address/');
  });
});

// ── USDC amount conversion ─────────────────────────────────────────────────

describe('USDC amount conversion', () => {
  it('10.5 USDC equals 10_500_000 micro-USDC', () => {
    expect(BigInt(Math.round(10.5 * 1_000_000))).toBe(10_500_000n);
  });

  it('0.05 USDC equals 50_000 micro-USDC', () => {
    expect(BigInt(Math.round(0.05 * 1_000_000))).toBe(50_000n);
  });

  it('round-trip 10.5: to micro and back equals 10.5', () => {
    const micro = BigInt(Math.round(10.5 * 1_000_000));
    expect(Number(micro) / 1_000_000).toBe(10.5);
  });

  it('handles zero', () => {
    expect(BigInt(Math.round(0 * 1_000_000))).toBe(0n);
  });
});

// ── createOnChainEscrow ────────────────────────────────────────────────────

describe('createOnChainEscrow()', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS', '0xESCROW_CONTRACT');
    vi.stubEnv('DEPLOYER_PRIVATE_KEY', '0xPRIVATEKEY');
  });

  it('returns txHash and escrowIdBytes32', async () => {
    const result = await createOnChainEscrow('escrow-001', '0xPAYEE', 5);
    expect(result.txHash).toBe('0xCREATE');
    expect(result.escrowIdBytes32).toBeDefined();
  });

  it('approves USDC when allowance is insufficient', async () => {
    mockUsdc.allowance.mockResolvedValue(0n);
    await createOnChainEscrow('escrow-002', '0xPAYEE', 10);
    expect(mockUsdc.approve).toHaveBeenCalled();
  });

  it('skips USDC approval when allowance is already sufficient', async () => {
    mockUsdc.allowance.mockResolvedValue(100_000_000n);
    await createOnChainEscrow('escrow-003', '0xPAYEE', 5);
    expect(mockUsdc.approve).not.toHaveBeenCalled();
  });

  it('calls contract createEscrow with converted amount', async () => {
    await createOnChainEscrow('escrow-004', '0xPAYEE', 5);
    expect(mockEscrowContract.createEscrow).toHaveBeenCalledWith(
      expect.any(String),
      '0xPAYEE',
      5_000_000n
    );
  });

  it('waits for create transaction confirmation', async () => {
    await createOnChainEscrow('escrow-005', '0xPAYEE', 5);
    expect(mockWait).toHaveBeenCalled();
  });
});

// ── releaseOnChainEscrow ───────────────────────────────────────────────────

describe('releaseOnChainEscrow()', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS', '0xESCROW_CONTRACT');
    vi.stubEnv('DEPLOYER_PRIVATE_KEY', '0xPRIVATEKEY');
  });

  it('returns the txHash', async () => {
    const result = await releaseOnChainEscrow('escrow-001');
    expect(result.txHash).toBe('0xRELEASE');
  });

  it('calls contract releaseEscrow with bytes32 id', async () => {
    await releaseOnChainEscrow('escrow-release-test');
    expect(mockEscrowContract.releaseEscrow).toHaveBeenCalledWith(expect.any(String));
  });

  it('waits for transaction confirmation', async () => {
    await releaseOnChainEscrow('escrow-wait-test');
    expect(mockWait).toHaveBeenCalled();
  });
});

// ── refundOnChainEscrow ────────────────────────────────────────────────────

describe('refundOnChainEscrow()', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS', '0xESCROW_CONTRACT');
    vi.stubEnv('DEPLOYER_PRIVATE_KEY', '0xPRIVATEKEY');
  });

  it('returns the txHash', async () => {
    const result = await refundOnChainEscrow('escrow-001');
    expect(result.txHash).toBe('0xREFUND');
  });

  it('calls contract refundEscrow with bytes32 id', async () => {
    await refundOnChainEscrow('escrow-refund-test');
    expect(mockEscrowContract.refundEscrow).toHaveBeenCalledWith(expect.any(String));
  });

  it('waits for transaction confirmation', async () => {
    await refundOnChainEscrow('escrow-wait-test');
    expect(mockWait).toHaveBeenCalled();
  });
});

// ── getOnChainEscrow ───────────────────────────────────────────────────────

describe('getOnChainEscrow()', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS', '0xESCROW_CONTRACT');
    vi.stubEnv('DEPLOYER_PRIVATE_KEY', '0xPRIVATEKEY');
  });

  it('returns formatted escrow data', async () => {
    const result = await getOnChainEscrow('escrow-001');
    expect(result.payer).toBe('0xPAYER');
    expect(result.payee).toBe('0xPAYEE');
    expect(result.amount).toBe(5);
    expect(result.state).toBe('Created');
    expect(typeof result.createdAt).toBe('string');
  });

  it('converts state index 1 to Released', async () => {
    mockEscrowContract.getEscrow.mockResolvedValueOnce([
      '0xPAYER', '0xPAYEE', 5_000_000n, 1n, 1_700_000_000n,
    ]);
    const result = await getOnChainEscrow('escrow-released');
    expect(result.state).toBe('Released');
  });

  it('converts state index 2 to Refunded', async () => {
    mockEscrowContract.getEscrow.mockResolvedValueOnce([
      '0xPAYER', '0xPAYEE', 5_000_000n, 2n, 1_700_000_000n,
    ]);
    const result = await getOnChainEscrow('escrow-refunded');
    expect(result.state).toBe('Refunded');
  });

  it('createdAt is a valid ISO date string', async () => {
    const result = await getOnChainEscrow('escrow-date');
    expect(() => new Date(result.createdAt)).not.toThrow();
    expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ── getContractStats ───────────────────────────────────────────────────────

describe('getContractStats()', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS', '0xESCROW_CONTRACT');
    vi.stubEnv('DEPLOYER_PRIVATE_KEY', '0xPRIVATEKEY');
  });

  it('returns correct escrowCount', async () => {
    const stats = await getContractStats();
    expect(stats.escrowCount).toBe(5);
  });

  it('returns correct lockedUsdc', async () => {
    const stats = await getContractStats();
    expect(stats.lockedUsdc).toBe(50);
  });

  it('returns correct network and chainId', async () => {
    const stats = await getContractStats();
    expect(stats.network).toBe('Base Sepolia');
    expect(stats.chainId).toBe(84532);
  });

  it('returns contractAddress from env', async () => {
    const stats = await getContractStats();
    expect(stats.contractAddress).toBe('0xESCROW_CONTRACT');
  });

  it('returns usdcAddress constant', async () => {
    const stats = await getContractStats();
    expect(stats.usdcAddress).toBe('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
  });

  it('calls both getEscrowCount and getContractBalance', async () => {
    await getContractStats();
    expect(mockEscrowContract.getEscrowCount).toHaveBeenCalled();
    expect(mockEscrowContract.getContractBalance).toHaveBeenCalled();
  });
});
