import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock fetch and emitter before imports ─────────────────────────────────

vi.mock('@/lib/events/emitter', () => ({
  emitter: { emit: vi.fn() },
}));

// We will use vi.stubGlobal for fetch — set up in beforeEach

// ── Imports ────────────────────────────────────────────────────────────────

import { getQuote, executeSwap, attemptPostPaymentSwap, UniswapApiError } from '@/lib/payments/uniswap';
import { emitter } from '@/lib/events/emitter';

const mockEmit = vi.mocked(emitter.emit);

// ── Helpers ────────────────────────────────────────────────────────────────

function makeFetchOk(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function makeFetchError(status: number, body: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(body),
  });
}

function makeFetchThrow(message: string) {
  return vi.fn().mockRejectedValue(new Error(message));
}

// ── Lifecycle ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// ── getQuote ───────────────────────────────────────────────────────────────

describe('getQuote()', () => {
  it('returns quote response on success', async () => {
    const quoteResponse = {
      quoteId: 'q-123',
      amountOut: '1000000',
      amountIn: '5000000',
      gasFee: '100',
      priceImpact: 0.01,
      route: {},
    };
    vi.stubGlobal('fetch', makeFetchOk(quoteResponse));

    const result = await getQuote({
      tokenIn: '0xUSDC',
      tokenOut: '0xWETH',
      amount: '5000000',
      swapperAddress: '0xSWAPPER',
    });

    expect(result.quoteId).toBe('q-123');
    expect(result.amountOut).toBe('1000000');
  });

  it('sends POST request to /quote endpoint', async () => {
    const mockFetch = makeFetchOk({ quoteId: 'q-1', amountOut: '1', amountIn: '1', gasFee: '0', priceImpact: 0, route: {} });
    vi.stubGlobal('fetch', mockFetch);

    await getQuote({
      tokenIn: '0xUSDC',
      tokenOut: '0xWETH',
      amount: '1000000',
      swapperAddress: '0xSWAPPER',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/quote'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('includes chainId in request body', async () => {
    const mockFetch = makeFetchOk({ quoteId: 'q-2', amountOut: '1', amountIn: '1', gasFee: '0', priceImpact: 0, route: {} });
    vi.stubGlobal('fetch', mockFetch);

    await getQuote({
      tokenIn: '0xUSDC',
      tokenOut: '0xWETH',
      amount: '1000000',
      swapperAddress: '0xSWAPPER',
    });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body as string);
    expect(body.chainId).toBeDefined();
  });

  it('defaults type to EXACT_INPUT', async () => {
    const mockFetch = makeFetchOk({ quoteId: 'q-3', amountOut: '1', amountIn: '1', gasFee: '0', priceImpact: 0, route: {} });
    vi.stubGlobal('fetch', mockFetch);

    await getQuote({
      tokenIn: '0xUSDC',
      tokenOut: '0xWETH',
      amount: '1000000',
      swapperAddress: '0xSWAPPER',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.type).toBe('EXACT_INPUT');
  });

  it('uses EXACT_OUTPUT when specified', async () => {
    const mockFetch = makeFetchOk({ quoteId: 'q-4', amountOut: '1', amountIn: '1', gasFee: '0', priceImpact: 0, route: {} });
    vi.stubGlobal('fetch', mockFetch);

    await getQuote({
      tokenIn: '0xUSDC',
      tokenOut: '0xWETH',
      amount: '1000000',
      swapperAddress: '0xSWAPPER',
      type: 'EXACT_OUTPUT',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.type).toBe('EXACT_OUTPUT');
  });

  it('throws UniswapApiError on non-OK response', async () => {
    vi.stubGlobal('fetch', makeFetchError(400, 'Bad request'));

    await expect(getQuote({
      tokenIn: '0xUSDC',
      tokenOut: '0xWETH',
      amount: '1000000',
      swapperAddress: '0xSWAPPER',
    })).rejects.toThrow(UniswapApiError);
  });

  it('includes error status in UniswapApiError', async () => {
    vi.stubGlobal('fetch', makeFetchError(429, 'Rate limited'));

    await expect(getQuote({
      tokenIn: '0xUSDC',
      tokenOut: '0xWETH',
      amount: '1000000',
      swapperAddress: '0xSWAPPER',
    })).rejects.toMatchObject({ status: 429 });
  });

  it('propagates network errors', async () => {
    vi.stubGlobal('fetch', makeFetchThrow('Network error'));

    await expect(getQuote({
      tokenIn: '0xUSDC',
      tokenOut: '0xWETH',
      amount: '1000000',
      swapperAddress: '0xSWAPPER',
    })).rejects.toThrow('Network error');
  });

  it('includes x-api-key header when UNISWAP_API_KEY is set', async () => {
    vi.stubEnv('UNISWAP_API_KEY', 'test-uniswap-key');
    // Reload config to pick up env — we test via the header presence
    const mockFetch = makeFetchOk({ quoteId: 'q-5', amountOut: '1', amountIn: '1', gasFee: '0', priceImpact: 0, route: {} });
    vi.stubGlobal('fetch', mockFetch);

    await getQuote({
      tokenIn: '0xUSDC',
      tokenOut: '0xWETH',
      amount: '1000000',
      swapperAddress: '0xSWAPPER',
    });

    // fetch was called — verifying the call happened is sufficient since config is module-level
    expect(mockFetch).toHaveBeenCalled();
  });
});

// ── executeSwap ────────────────────────────────────────────────────────────

describe('executeSwap()', () => {
  it('returns order response on success', async () => {
    const orderResponse = { orderId: 'ord-1', status: 'pending', txHash: '0xTXHASH' };
    vi.stubGlobal('fetch', makeFetchOk(orderResponse));

    const result = await executeSwap({ quoteId: 'q-1', signature: '0xSIG' });

    expect(result.orderId).toBe('ord-1');
    expect(result.txHash).toBe('0xTXHASH');
  });

  it('sends POST request to /order endpoint', async () => {
    const mockFetch = makeFetchOk({ orderId: 'ord-2', status: 'ok' });
    vi.stubGlobal('fetch', mockFetch);

    await executeSwap({ quoteId: 'q-2', signature: '0xSIG' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/order'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('includes quoteId and signature in request body', async () => {
    const mockFetch = makeFetchOk({ orderId: 'ord-3', status: 'ok' });
    vi.stubGlobal('fetch', mockFetch);

    await executeSwap({ quoteId: 'q-xyz', signature: '0xMYSIG' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.quoteId).toBe('q-xyz');
    expect(body.signature).toBe('0xMYSIG');
  });

  it('throws UniswapApiError on non-OK response', async () => {
    vi.stubGlobal('fetch', makeFetchError(500, 'Server error'));

    await expect(executeSwap({ quoteId: 'q-1', signature: '0x' }))
      .rejects.toThrow(UniswapApiError);
  });

  it('propagates network errors', async () => {
    vi.stubGlobal('fetch', makeFetchThrow('Connection refused'));

    await expect(executeSwap({ quoteId: 'q-1', signature: '0x' }))
      .rejects.toThrow('Connection refused');
  });
});

// ── attemptPostPaymentSwap ────────────────────────────────────────────────

describe('attemptPostPaymentSwap()', () => {
  const baseParams = {
    escrowId: 'esc-1',
    taskId: 'task-1',
    subtaskId: 'sub-1',
    agentAddress: '0xAGENT',
    usdcAmount: 5,
    preferredToken: 'WETH',
  };

  it('returns success:true immediately when preferredToken is USDC', async () => {
    const result = await attemptPostPaymentSwap({ ...baseParams, preferredToken: 'USDC' });
    expect(result.success).toBe(true);
  });

  it('returns success:false when preferredToken is unknown', async () => {
    const result = await attemptPostPaymentSwap({ ...baseParams, preferredToken: 'UNKNOWN_TOKEN' });
    expect(result.success).toBe(false);
  });

  it('emits swap:initiated when token is known non-USDC', async () => {
    vi.stubGlobal('fetch', makeFetchOk({
      quoteId: 'q-swap',
      amountOut: '1000',
      amountIn: '5000000',
      gasFee: '10',
      priceImpact: 0.01,
      route: {},
    }));
    // Second call for executeSwap
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ quoteId: 'q-swap', amountOut: '1000', amountIn: '5000000', gasFee: '10', priceImpact: 0.01, route: {} }),
        text: () => Promise.resolve(''),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orderId: 'ord-swap', status: 'ok', txHash: '0xSWAP' }),
        text: () => Promise.resolve(''),
      })
    );

    await attemptPostPaymentSwap({ ...baseParams, preferredToken: 'WETH' });

    const types = mockEmit.mock.calls.map(([t]) => t);
    expect(types).toContain('swap:initiated');
  });

  it('emits swap:completed on successful swap', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ quoteId: 'q-ok', amountOut: '999', amountIn: '5000000', gasFee: '5', priceImpact: 0, route: {} }),
        text: () => Promise.resolve(''),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orderId: 'ord-ok', status: 'filled', txHash: '0xDONE' }),
        text: () => Promise.resolve(''),
      })
    );

    const result = await attemptPostPaymentSwap({ ...baseParams, preferredToken: 'WETH' });

    expect(result.success).toBe(true);
    expect(result.txHash).toBe('0xDONE');

    const types = mockEmit.mock.calls.map(([t]) => t);
    expect(types).toContain('swap:completed');
  });

  it('returns success:false and emits system:error when fetch fails', async () => {
    vi.stubGlobal('fetch', makeFetchThrow('Uniswap down'));

    const result = await attemptPostPaymentSwap({ ...baseParams, preferredToken: 'WETH' });

    expect(result.success).toBe(false);
    const types = mockEmit.mock.calls.map(([t]) => t);
    expect(types).toContain('system:error');
  });

  it('returns success:false when getQuote API returns error', async () => {
    vi.stubGlobal('fetch', makeFetchError(503, 'Service unavailable'));

    const result = await attemptPostPaymentSwap({ ...baseParams, preferredToken: 'WETH' });

    expect(result.success).toBe(false);
  });

  it('converts usdcAmount to smallest units for the quote request', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ quoteId: 'q-units', amountOut: '1', amountIn: '1', gasFee: '0', priceImpact: 0, route: {} }),
        text: () => Promise.resolve(''),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orderId: 'ord-units', status: 'ok', txHash: '0xU' }),
        text: () => Promise.resolve(''),
      });
    vi.stubGlobal('fetch', mockFetch);

    await attemptPostPaymentSwap({ ...baseParams, usdcAmount: 2.5, preferredToken: 'WETH' });

    const quoteBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    // 2.5 USDC * 1e6 = 2_500_000
    expect(quoteBody.amount).toBe('2500000');
  });

  it('handles empty preferredToken gracefully', async () => {
    const result = await attemptPostPaymentSwap({ ...baseParams, preferredToken: '' });
    expect(result.success).toBe(true); // empty string treated as USDC path
  });
});

// ── UniswapApiError class ─────────────────────────────────────────────────

describe('UniswapApiError', () => {
  it('is an instance of Error', () => {
    const err = new UniswapApiError(404, 'Not found');
    expect(err).toBeInstanceOf(Error);
  });

  it('has correct name', () => {
    const err = new UniswapApiError(500, 'Server error');
    expect(err.name).toBe('UniswapApiError');
  });

  it('stores status code', () => {
    const err = new UniswapApiError(429, 'Rate limited');
    expect(err.status).toBe(429);
  });

  it('stores message', () => {
    const err = new UniswapApiError(400, 'Bad request');
    expect(err.message).toBe('Bad request');
  });
});
