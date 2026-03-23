import { LocusRegisterResponse, LocusBalanceResponse, LocusSendResponse, LocusTransactionRecord } from '../types';
import { config } from '../config';

class LocusApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'LocusApiError';
  }
}

async function locusRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  apiKey?: string
): Promise<T> {
  const url = `${config.locusBaseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
  };

  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new LocusApiError(response.status, `Locus API error ${response.status}: ${body}`);
  }

  const json = await response.json();
  // Locus wraps responses in { success, data } envelope
  if (json.success === true && json.data !== undefined) {
    return json.data as T;
  }
  if (json.success === false) {
    throw new LocusApiError(response.status, json.message || json.error || 'Locus API error');
  }
  return json as T;
}

export async function registerAgent(name: string, email?: string): Promise<LocusRegisterResponse> {
  const body: Record<string, string> = { name };
  if (email) body.email = email;
  return locusRequest<LocusRegisterResponse>('/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getBalance(apiKey: string): Promise<LocusBalanceResponse> {
  return locusRequest<LocusBalanceResponse>('/pay/balance', { method: 'GET' }, apiKey);
}

export async function sendPayment(
  apiKey: string,
  toAddress: string,
  amount: number
): Promise<LocusSendResponse> {
  return locusRequest<LocusSendResponse>(
    '/pay/send',
    {
      method: 'POST',
      body: JSON.stringify({ to: toAddress, amount: amount.toString() }),
    },
    apiKey
  );
}

export async function getTransactions(apiKey: string): Promise<LocusTransactionRecord[]> {
  return locusRequest<LocusTransactionRecord[]>('/pay/transactions', { method: 'GET' }, apiKey);
}

export async function requestHackathonCredits(
  apiKey: string,
  reason: string,
  amount: number
): Promise<{ status: string }> {
  return locusRequest<{ status: string }>(
    '/gift-code-requests',
    {
      method: 'POST',
      body: JSON.stringify({ reason, requestedAmountUsdc: amount }),
    },
    apiKey
  );
}

// LLM calls through Locus wrapped API (creates on-chain artifacts)
export async function wrappedOpenAICall(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  model: string = 'gpt-4o',
  jsonMode: boolean = true
): Promise<string> {
  const body: Record<string, unknown> = { model, messages };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await locusRequest<{
    choices: Array<{ message: { content: string } }>;
  }>(
    '/wrapped/openai/chat',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    apiKey
  );

  return response.choices[0]?.message?.content || '';
}

export { LocusApiError };
