import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  registerAgent,
  getBalance,
  sendPayment,
  wrappedOpenAICall,
  getTransactions,
  requestHackathonCredits,
  LocusApiError,
} from '@/lib/payments/locus';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    text: vi.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
    json: vi.fn().mockResolvedValue(body),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ──────────────────────────────────────────────────────────────────────────────
// registerAgent
// ──────────────────────────────────────────────────────────────────────────────
describe('registerAgent()', () => {
  it('returns registration data on success (wrapped envelope)', async () => {
    const payload = { apiKey: 'key-123', walletId: 'wallet-abc', ownerAddress: '0xDEAD' };
    mockFetch.mockResolvedValueOnce(makeResponse({ success: true, data: payload }));

    const result = await registerAgent('TestAgent');

    expect(result).toEqual(payload);
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/register');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toMatchObject({ name: 'TestAgent' });
  });

  it('includes email in body when provided', async () => {
    const payload = { apiKey: 'k', walletId: 'w', ownerAddress: '0x1' };
    mockFetch.mockResolvedValueOnce(makeResponse({ success: true, data: payload }));

    await registerAgent('Agent', 'agent@example.com');

    const [, opts] = mockFetch.mock.calls[0];
    expect(JSON.parse(opts.body)).toMatchObject({ name: 'Agent', email: 'agent@example.com' });
  });

  it('returns unwrapped JSON when no success envelope', async () => {
    const payload = { apiKey: 'k2', walletId: 'w2', ownerAddress: '0x2' };
    mockFetch.mockResolvedValueOnce(makeResponse(payload));

    const result = await registerAgent('Agent2');
    expect(result).toEqual(payload);
  });

  it('throws LocusApiError on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse('Bad Request', false, 400));

    await expect(registerAgent('Bad')).rejects.toBeInstanceOf(LocusApiError);
  });

  it('throws LocusApiError when success is false', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ success: false, message: 'Already registered' })
    );

    await expect(registerAgent('Dup')).rejects.toBeInstanceOf(LocusApiError);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// getBalance
// ──────────────────────────────────────────────────────────────────────────────
describe('getBalance()', () => {
  it('returns balance data for a valid API key', async () => {
    const payload = { balance: '50.00', walletAddress: '0xABC' };
    mockFetch.mockResolvedValueOnce(makeResponse({ success: true, data: payload }));

    const result = await getBalance('valid-api-key');

    expect(result.balance).toBe('50.00');
    expect(result.walletAddress).toBe('0xABC');
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/pay/balance');
    expect(opts.method).toBe('GET');
  });

  it('throws LocusApiError on 401 unauthorized', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse('Unauthorized', false, 401));

    await expect(getBalance('bad-key')).rejects.toBeInstanceOf(LocusApiError);
  });

  it('sends Authorization header', async () => {
    const payload = { balance: '0', walletAddress: '0x0' };
    mockFetch.mockResolvedValueOnce(makeResponse({ success: true, data: payload }));

    await getBalance('my-secret-key');

    const [, opts] = mockFetch.mock.calls[0];
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer my-secret-key');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// sendPayment
// ──────────────────────────────────────────────────────────────────────────────
describe('sendPayment()', () => {
  it('sends payment and returns transaction data', async () => {
    const payload = {
      transactionHash: '0xTXHASH',
      amount: '10',
      to: '0xRECIPIENT',
      from: '0xSENDER',
      status: 'confirmed',
    };
    mockFetch.mockResolvedValueOnce(makeResponse({ success: true, data: payload }));

    const result = await sendPayment('api-key', '0xRECIPIENT', 10);

    expect(result.transactionHash).toBe('0xTXHASH');
    expect(result.status).toBe('confirmed');
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/pay/send');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toMatchObject({ to: '0xRECIPIENT', amount: '10' });
  });

  it('throws LocusApiError on insufficient funds', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse({ success: false, message: 'Insufficient funds' })
    );

    await expect(sendPayment('api-key', '0xADDR', 9999)).rejects.toBeInstanceOf(LocusApiError);
  });

  it('converts amount to string in body', async () => {
    const payload = { transactionHash: '0x1', amount: '5.5', to: '0x2', from: '0x3', status: 'ok' };
    mockFetch.mockResolvedValueOnce(makeResponse({ success: true, data: payload }));

    await sendPayment('key', '0x2', 5.5);

    const [, opts] = mockFetch.mock.calls[0];
    expect(JSON.parse(opts.body).amount).toBe('5.5');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// wrappedOpenAICall
// ──────────────────────────────────────────────────────────────────────────────
describe('wrappedOpenAICall()', () => {
  it('returns LLM response content', async () => {
    const payload = {
      choices: [{ message: { content: '{"result":"hello"}' } }],
    };
    mockFetch.mockResolvedValueOnce(makeResponse({ success: true, data: payload }));

    const result = await wrappedOpenAICall('api-key', [{ role: 'user', content: 'hi' }]);

    expect(result).toBe('{"result":"hello"}');
  });

  it('sends correct model and messages', async () => {
    const payload = { choices: [{ message: { content: '{}' } }] };
    mockFetch.mockResolvedValueOnce(makeResponse({ success: true, data: payload }));

    await wrappedOpenAICall(
      'key',
      [{ role: 'system', content: 'You are helpful' }],
      'gpt-4o',
      true
    );

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/wrapped/openai/chat');
    const body = JSON.parse(opts.body);
    expect(body.model).toBe('gpt-4o');
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('omits response_format when jsonMode is false', async () => {
    const payload = { choices: [{ message: { content: 'plain text' } }] };
    mockFetch.mockResolvedValueOnce(makeResponse({ success: true, data: payload }));

    await wrappedOpenAICall('key', [{ role: 'user', content: 'hello' }], 'gpt-4o', false);

    const [, opts] = mockFetch.mock.calls[0];
    expect(JSON.parse(opts.body).response_format).toBeUndefined();
  });

  it('returns empty string when choices array is empty', async () => {
    const payload = { choices: [] };
    mockFetch.mockResolvedValueOnce(makeResponse({ success: true, data: payload }));

    const result = await wrappedOpenAICall('key', []);
    expect(result).toBe('');
  });

  it('throws LocusApiError on API failure', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse('Server Error', false, 500));

    await expect(wrappedOpenAICall('key', [])).rejects.toBeInstanceOf(LocusApiError);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// getTransactions
// ──────────────────────────────────────────────────────────────────────────────
describe('getTransactions()', () => {
  it('returns list of transactions', async () => {
    const payload = [
      { transactionHash: '0xAA', from: '0x1', to: '0x2', amount: '5', token: 'USDC', timestamp: 't', status: 'ok' },
    ];
    mockFetch.mockResolvedValueOnce(makeResponse({ success: true, data: payload }));

    const result = await getTransactions('key');
    expect(result).toHaveLength(1);
    expect(result[0].transactionHash).toBe('0xAA');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// requestHackathonCredits
// ──────────────────────────────────────────────────────────────────────────────
describe('requestHackathonCredits()', () => {
  it('sends credit request and returns status', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ success: true, data: { status: 'pending' } }));

    const result = await requestHackathonCredits('key', 'hackathon demo', 100);
    expect(result.status).toBe('pending');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/gift-code-requests');
    expect(JSON.parse(opts.body)).toMatchObject({ reason: 'hackathon demo', requestedAmountUsdc: 100 });
  });
});
