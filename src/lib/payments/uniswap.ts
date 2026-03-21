import { UniswapQuoteRequest, UniswapQuoteResponse, UniswapOrderResponse } from '../types';
import { config } from '../config';
import { emitter } from '../events/emitter';

class UniswapApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'UniswapApiError';
  }
}

async function uniswapRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${config.uniswapBaseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(config.uniswapApiKey ? { 'x-api-key': config.uniswapApiKey } : {}),
  };

  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new UniswapApiError(response.status, `Uniswap API error ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export async function getQuote(params: {
  tokenIn: string;
  tokenOut: string;
  amount: string;
  swapperAddress: string;
  type?: 'EXACT_INPUT' | 'EXACT_OUTPUT';
}): Promise<UniswapQuoteResponse> {
  const body: UniswapQuoteRequest = {
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    amount: params.amount,
    type: params.type || 'EXACT_INPUT',
    chainId: config.chainId,
  };

  return uniswapRequest<UniswapQuoteResponse>('/quote', {
    method: 'POST',
    body: JSON.stringify({
      ...body,
      swapper: params.swapperAddress,
    }),
  });
}

export async function executeSwap(params: {
  quoteId: string;
  signature: string;
}): Promise<UniswapOrderResponse> {
  return uniswapRequest<UniswapOrderResponse>('/order', {
    method: 'POST',
    body: JSON.stringify({
      quoteId: params.quoteId,
      signature: params.signature,
      chainId: config.chainId,
    }),
  });
}

/**
 * Attempt a post-payment swap for agents that prefer non-USDC tokens.
 * This is called after escrow release - if it fails, the agent keeps USDC.
 */
export async function attemptPostPaymentSwap(params: {
  escrowId: string;
  taskId: string;
  subtaskId: string;
  agentAddress: string;
  usdcAmount: number;
  preferredToken: string;
}): Promise<{ success: boolean; txHash?: string }> {
  const { escrowId, taskId, subtaskId, agentAddress, usdcAmount, preferredToken } = params;

  // Only swap if preferred token is not USDC
  if (preferredToken === 'USDC' || !preferredToken) {
    return { success: true };
  }

  const tokenOutAddress = config.tokens[preferredToken as keyof typeof config.tokens];
  if (!tokenOutAddress) {
    console.warn(`Unknown token: ${preferredToken}, keeping USDC`);
    return { success: false };
  }

  emitter.emit('swap:initiated', {
    taskId,
    subtaskId,
    message: `Swapping ${usdcAmount} USDC to ${preferredToken} for agent`,
    data: { escrowId, amount: usdcAmount, tokenOut: preferredToken },
  });

  try {
    // Step 1: Get quote
    const usdcAmountSmallest = Math.floor(usdcAmount * 1e6).toString(); // USDC has 6 decimals

    const quote = await getQuote({
      tokenIn: config.tokens.USDC,
      tokenOut: tokenOutAddress,
      amount: usdcAmountSmallest,
      swapperAddress: agentAddress,
    });

    // Step 2: Execute swap
    // Note: In production, the agent would sign the transaction
    // For hackathon demo, we log the quote and simulate
    const order = await executeSwap({
      quoteId: quote.quoteId,
      signature: '0x', // Placeholder - would need actual wallet signing
    });

    emitter.emit('swap:completed', {
      taskId,
      subtaskId,
      message: `Swapped ${usdcAmount} USDC to ${preferredToken}`,
      data: {
        escrowId,
        txHash: order.txHash,
        amountIn: usdcAmount,
        amountOut: quote.amountOut,
        tokenOut: preferredToken,
      },
    });

    return { success: true, txHash: order.txHash };
  } catch (error) {
    console.warn('Uniswap swap failed (agent keeps USDC):', error);

    emitter.emit('system:error', {
      taskId,
      subtaskId,
      message: `Swap failed, agent keeps USDC: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });

    return { success: false };
  }
}

export { UniswapApiError };
