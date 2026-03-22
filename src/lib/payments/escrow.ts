import { v4 as uuidv4 } from 'uuid';
import { Escrow } from '../types';
import { sendPayment, getBalance } from './locus';
import { emitter } from '../events/emitter';
import { isSimulationMode } from '../llm/simulator';

// In-memory escrow store
const escrows = new Map<string, Escrow>();

export async function createEscrow(params: {
  taskId: string;
  subtaskId: string;
  clientAgentId: string;
  providerAgentId: string;
  clientAddress: string;
  providerAddress: string;
  clientApiKey: string;
  amount: number;
}): Promise<Escrow> {
  const escrow: Escrow = {
    id: uuidv4(),
    taskId: params.taskId,
    subtaskId: params.subtaskId,
    clientAgentId: params.clientAgentId,
    providerAgentId: params.providerAgentId,
    clientAddress: params.clientAddress,
    providerAddress: params.providerAddress,
    amount: params.amount,
    status: 'created',
    createdAt: new Date().toISOString(),
  };

  escrows.set(escrow.id, escrow);

  emitter.emit('escrow:created', {
    taskId: params.taskId,
    subtaskId: params.subtaskId,
    message: `Escrow created: ${params.amount} USDC for subtask`,
    data: { escrowId: escrow.id, amount: params.amount },
  });

  // Fund the escrow (in app-level escrow, this is a hold - we verify balance)
  try {
    if (isSimulationMode()) {
      // Simulation: skip real balance check, auto-fund
      escrow.status = 'funded';
      escrow.fundedAt = new Date().toISOString();
      escrows.set(escrow.id, escrow);

      emitter.emit('escrow:funded', {
        taskId: params.taskId,
        subtaskId: params.subtaskId,
        message: `Escrow funded (sim): ${params.amount} USDC locked`,
        data: { escrowId: escrow.id, balance: '1000.00', simulated: true },
      });
    } else {
      const balance = await getBalance(params.clientApiKey);
      if (parseFloat(balance.balance) < params.amount) {
        escrow.status = 'failed';
        escrows.set(escrow.id, escrow);
        throw new Error(`Insufficient balance: ${balance.balance} USDC, need ${params.amount}`);
      }

      escrow.status = 'funded';
      escrow.fundedAt = new Date().toISOString();
      escrows.set(escrow.id, escrow);

      emitter.emit('escrow:funded', {
        taskId: params.taskId,
        subtaskId: params.subtaskId,
        message: `Escrow funded: ${params.amount} USDC verified`,
        data: { escrowId: escrow.id, balance: balance.balance },
      });
    }
  } catch (error) {
    escrow.status = 'failed';
    escrows.set(escrow.id, escrow);
    throw error;
  }

  return escrow;
}

export async function releaseEscrow(
  escrowId: string,
  clientApiKey: string
): Promise<Escrow> {
  const escrow = escrows.get(escrowId);
  if (!escrow) throw new Error(`Escrow not found: ${escrowId}`);
  if (escrow.status !== 'funded') throw new Error(`Cannot release escrow in status: ${escrow.status}`);

  try {
    if (isSimulationMode()) {
      // Simulation: skip real payment, mark as released
      escrow.status = 'released';
      escrow.releaseTxHash = `0xsim_${escrowId.slice(0, 16)}`;
      escrow.releasedAt = new Date().toISOString();
      escrows.set(escrowId, escrow);

      emitter.emit('escrow:released', {
        taskId: escrow.taskId,
        subtaskId: escrow.subtaskId,
        message: `Payment released (sim): ${escrow.amount} USDC sent`,
        data: {
          escrowId: escrow.id,
          amount: escrow.amount,
          txHash: escrow.releaseTxHash,
          to: escrow.providerAddress,
          simulated: true,
        },
      });
    } else {
      const result = await sendPayment(clientApiKey, escrow.providerAddress, escrow.amount);

      escrow.status = 'released';
      escrow.releaseTxHash = result.transactionHash;
      escrow.releasedAt = new Date().toISOString();
      escrows.set(escrowId, escrow);

      emitter.emit('escrow:released', {
        taskId: escrow.taskId,
        subtaskId: escrow.subtaskId,
        message: `Payment released: ${escrow.amount} USDC sent`,
        data: {
          escrowId: escrow.id,
          amount: escrow.amount,
          txHash: result.transactionHash,
          to: escrow.providerAddress,
        },
      });
    }

    return escrow;
  } catch (error) {
    escrow.status = 'failed';
    escrows.set(escrowId, escrow);
    throw error;
  }
}

export async function refundEscrow(
  escrowId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  clientApiKey: string
): Promise<Escrow> {
  const escrow = escrows.get(escrowId);
  if (!escrow) throw new Error(`Escrow not found: ${escrowId}`);
  if (escrow.status !== 'funded') throw new Error(`Cannot refund escrow in status: ${escrow.status}`);

  // In app-level escrow, refund means no payment was sent
  escrow.status = 'refunded';
  escrows.set(escrowId, escrow);

  emitter.emit('escrow:refunded', {
    taskId: escrow.taskId,
    subtaskId: escrow.subtaskId,
    message: `Escrow refunded: ${escrow.amount} USDC returned`,
    data: { escrowId: escrow.id, amount: escrow.amount },
  });

  return escrow;
}

export function getEscrow(id: string): Escrow | undefined {
  return escrows.get(id);
}

export function getEscrowsByTask(taskId: string): Escrow[] {
  return Array.from(escrows.values()).filter((e) => e.taskId === taskId);
}

export function getAllEscrows(): Escrow[] {
  return Array.from(escrows.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
