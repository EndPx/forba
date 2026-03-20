// ============================================================
// src/lib/types/index.ts - Forba Type Definitions
// ============================================================

// --- Agent Types ---
export type AgentType = 'orchestrator' | 'code' | 'research' | 'copy';
export type AgentStatus = 'idle' | 'working' | 'offline';

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  description: string;
  capabilities: string[];
  pricing: number;
  locusApiKey: string;
  locusWalletId: string;
  locusOwnerAddress: string;
  preferredToken: string;
  status: AgentStatus;
  totalEarnings: number;
  tasksCompleted: number;
  createdAt: string;
}

export interface AgentSeed {
  name: string;
  type: AgentType;
  description: string;
  capabilities: string[];
  pricing: number;
  preferredToken?: string;
}

// --- Task Types ---
export type TaskStatus = 'pending' | 'decomposing' | 'in_progress' | 'completed' | 'failed';

export interface Task {
  id: string;
  description: string;
  status: TaskStatus;
  subtasks: Subtask[];
  finalResult?: string;
  createdAt: string;
  completedAt?: string;
}

export type SubtaskType = 'code' | 'research' | 'copy';
export type SubtaskStatus = 'pending' | 'assigned' | 'in_progress' | 'delivered' | 'approved' | 'rejected' | 'failed';

export interface Subtask {
  id: string;
  taskId: string;
  description: string;
  type: SubtaskType;
  status: SubtaskStatus;
  assignedAgentId?: string;
  deliverable?: string;
  evaluationReason?: string;
  escrowId?: string;
  createdAt: string;
  completedAt?: string;
}

// --- Escrow Types ---
export type EscrowStatus = 'created' | 'funded' | 'released' | 'refunded' | 'failed';

export interface Escrow {
  id: string;
  taskId: string;
  subtaskId: string;
  clientAgentId: string;
  providerAgentId: string;
  clientAddress: string;
  providerAddress: string;
  amount: number;
  status: EscrowStatus;
  fundTxHash?: string;
  releaseTxHash?: string;
  refundTxHash?: string;
  swapTxHash?: string;
  createdAt: string;
  fundedAt?: string;
  releasedAt?: string;
}

// --- Event Types ---
export type EventType =
  | 'task:created'
  | 'task:decomposed'
  | 'task:completed'
  | 'task:failed'
  | 'agent:hired'
  | 'agent:working'
  | 'agent:delivered'
  | 'escrow:created'
  | 'escrow:funded'
  | 'escrow:released'
  | 'escrow:refunded'
  | 'evaluation:started'
  | 'evaluation:passed'
  | 'evaluation:failed'
  | 'swap:initiated'
  | 'swap:completed'
  | 'system:error';

export interface AgentEvent {
  id: string;
  type: EventType;
  taskId?: string;
  subtaskId?: string;
  agentId?: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

// --- Locus API Types ---
export interface LocusRegisterResponse {
  apiKey: string;
  walletId: string;
  ownerAddress: string;
}

export interface LocusBalanceResponse {
  balance: string;
  walletAddress: string;
}

export interface LocusSendResponse {
  transactionHash: string;
  amount: string;
  to: string;
  from: string;
  status: string;
}

export interface LocusTransactionRecord {
  transactionHash: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  timestamp: string;
  status: string;
}

// --- Uniswap API Types ---
export interface UniswapQuoteRequest {
  tokenIn: string;
  tokenOut: string;
  amount: string;
  type: 'EXACT_INPUT' | 'EXACT_OUTPUT';
  chainId: number;
}

export interface UniswapQuoteResponse {
  quoteId: string;
  amountOut: string;
  amountIn: string;
  gasFee: string;
  priceImpact: number;
  route: unknown;
}

export interface UniswapOrderResponse {
  orderId: string;
  status: string;
  txHash?: string;
}

// --- LLM Types ---
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DecompositionResult {
  subtasks: Array<{
    description: string;
    type: SubtaskType;
    estimatedComplexity: 'low' | 'medium' | 'high';
  }>;
  reasoning: string;
}

export interface EvaluationResult {
  passed: boolean;
  score: number;
  reasoning: string;
  suggestions?: string[];
}

// --- Config ---
export interface AppConfig {
  locusBaseUrl: string;
  uniswapBaseUrl: string;
  maxSubtasks: number;
  maxUsdcPerTask: number;
  escrowTimeoutMs: number;
  llmModel: string;
}
