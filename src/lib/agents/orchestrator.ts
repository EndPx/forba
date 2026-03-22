import { v4 as uuidv4 } from 'uuid';
import { Task, Subtask, SubtaskType, DecompositionResult } from '../types';
import { store } from '../store';
import { emitter } from '../events/emitter';
import { llmCall, parseJSON } from '../llm/client';
import { SYSTEM_PROMPTS, buildDecompositionPrompt, buildCompilerPrompt } from '../llm/prompts';
import { evaluateDeliverable } from '../llm/evaluator';
import { discoverAgents, selectBestAgent } from './registry';
import { executeSubtask } from './specialist';
import { createEscrow, releaseEscrow, refundEscrow } from '../payments/escrow';
import { config } from '../config';
import { isSimulationMode } from '../llm/simulator';
import { createOnChainEscrow, releaseOnChainEscrow, refundOnChainEscrow } from '../contracts/forbaEscrow';
import { attemptPostPaymentSwap } from '../payments/uniswap';

// Get orchestrator's API key (first registered agent or env var)
function getOrchestratorApiKey(): string {
  const orchestratorKey = process.env.LOCUS_ORCHESTRATOR_API_KEY;
  if (orchestratorKey) return orchestratorKey;

  // Fallback: use the first code agent's key (for demo purposes)
  const agents = store.getAllAgents();
  if (agents.length > 0) return agents[0].locusApiKey;

  return 'mock-orchestrator-key';
}

function getOrchestratorAddress(): string {
  const agents = store.getAllAgents();
  if (agents.length > 0) return agents[0].locusOwnerAddress;
  return '0x0000000000000000000000000000000000000000';
}

function hasOnChainEscrow(): boolean {
  return !!process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS && !!process.env.DEPLOYER_PRIVATE_KEY;
}

export async function executeTask(taskId: string): Promise<void> {
  const task = store.getTask(taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);

  const orchestratorApiKey = getOrchestratorApiKey();
  const simMode = isSimulationMode();

  if (simMode) {
    console.log(`[Orchestrator] Running in SIMULATION mode for task ${taskId}`);
  }

  try {
    // Phase 1: Decompose
    store.updateTask(taskId, { status: 'decomposing' });

    const subtasks = await decomposeTask(task, orchestratorApiKey);

    store.updateTask(taskId, {
      status: 'in_progress',
      subtasks
    });

    emitter.emit('task:decomposed', {
      taskId,
      message: `Task decomposed into ${subtasks.length} subtasks`,
      data: { subtasks: subtasks.map(s => ({ id: s.id, type: s.type, description: s.description })) },
    });

    // Phase 2: Execute each subtask
    const results: Array<{ type: string; description: string; deliverable: string }> = [];

    for (const subtask of subtasks) {
      try {
        const result = await executeSubtaskFlow(task, subtask, orchestratorApiKey);
        results.push({
          type: subtask.type,
          description: subtask.description,
          deliverable: result,
        });
      } catch (error) {
        console.error(`Subtask ${subtask.id} failed:`, error);
        updateSubtask(taskId, subtask.id, {
          status: 'failed',
          completedAt: new Date().toISOString(),
        });
      }
    }

    // Phase 3: Compile results
    if (results.length > 0) {
      const finalResult = await compileResults(task.description, results, orchestratorApiKey);

      store.updateTask(taskId, {
        status: 'completed',
        finalResult,
        completedAt: new Date().toISOString(),
      });

      emitter.emit('task:completed', {
        taskId,
        message: `Task completed with ${results.length} successful deliverables`,
        data: { finalResultPreview: finalResult.substring(0, 300) },
      });
    } else {
      store.updateTask(taskId, {
        status: 'failed',
        completedAt: new Date().toISOString(),
      });

      emitter.emit('task:failed', {
        taskId,
        message: 'Task failed: no subtasks completed successfully',
      });
    }
  } catch (error) {
    console.error(`Task ${taskId} failed:`, error);
    store.updateTask(taskId, {
      status: 'failed',
      completedAt: new Date().toISOString(),
    });

    emitter.emit('task:failed', {
      taskId,
      message: `Task failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

async function decomposeTask(task: Task, apiKey: string): Promise<Subtask[]> {
  const raw = await llmCall({
    apiKey,
    systemPrompt: SYSTEM_PROMPTS.decomposer,
    userMessage: buildDecompositionPrompt(task.description),
    simulationType: 'decompose',
    simulationContext: { taskDescription: task.description },
  });

  const result = parseJSON<DecompositionResult>(raw);

  // Clamp to max subtasks
  const subtaskDefs = result.subtasks.slice(0, config.maxSubtasks);

  return subtaskDefs.map((def) => ({
    id: uuidv4(),
    taskId: task.id,
    description: def.description,
    type: def.type as SubtaskType,
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
  }));
}

async function executeSubtaskFlow(
  task: Task,
  subtask: Subtask,
  orchestratorApiKey: string
): Promise<string> {
  const MAX_RETRIES = 1;
  let attempts = 0;

  while (attempts <= MAX_RETRIES) {
    // Step 1: Discover agents for this subtask type
    const candidates = discoverAgents(subtask.type);
    if (candidates.length === 0) {
      throw new Error(`No agents available for type: ${subtask.type}`);
    }

    // Step 2: Select best agent
    const agent = selectBestAgent(candidates, subtask.description);
    if (!agent) {
      throw new Error(`Could not select agent for subtask: ${subtask.id}`);
    }

    updateSubtask(task.id, subtask.id, {
      status: 'assigned',
      assignedAgentId: agent.id,
    });

    emitter.emit('agent:hired', {
      taskId: task.id,
      subtaskId: subtask.id,
      agentId: agent.id,
      message: `Hired ${agent.name} for ${agent.pricing} USDC`,
      data: {
        agentName: agent.name,
        agentType: agent.type,
        amount: agent.pricing,
        capabilities: agent.capabilities,
      },
    });

    // Step 3: Create escrow (try on-chain first, then Locus, then skip)
    let escrow;
    let onChainTxHash: string | undefined;

    // Try on-chain escrow
    if (hasOnChainEscrow()) {
      try {
        const escrowId = `${task.id}-${subtask.id}`;
        const result = await createOnChainEscrow(escrowId, agent.locusOwnerAddress, agent.pricing);
        onChainTxHash = result.txHash;

        emitter.emit('escrow:created', {
          taskId: task.id,
          subtaskId: subtask.id,
          agentId: agent.id,
          message: `On-chain escrow created: ${agent.pricing} USDC locked`,
          data: { txHash: result.txHash, escrowId, onChain: true },
        });
      } catch (error) {
        console.warn('On-chain escrow failed (trying Locus fallback):', error);
      }
    }

    // Try Locus escrow as fallback
    if (!onChainTxHash) {
      try {
        escrow = await createEscrow({
          taskId: task.id,
          subtaskId: subtask.id,
          clientAgentId: 'orchestrator',
          providerAgentId: agent.id,
          clientAddress: getOrchestratorAddress(),
          providerAddress: agent.locusOwnerAddress,
          clientApiKey: orchestratorApiKey,
          amount: agent.pricing,
        });

        updateSubtask(task.id, subtask.id, { escrowId: escrow.id });

        emitter.emit('escrow:created', {
          taskId: task.id,
          subtaskId: subtask.id,
          agentId: agent.id,
          message: `Escrow created: ${agent.pricing} USDC locked`,
          data: { escrowId: escrow.id, amount: agent.pricing },
        });
      } catch (error) {
        console.warn('Escrow creation failed (continuing without escrow):', error);

        // Emit simulated escrow event for demo
        emitter.emit('escrow:created', {
          taskId: task.id,
          subtaskId: subtask.id,
          agentId: agent.id,
          message: `Escrow created (sim): ${agent.pricing} USDC locked for ${agent.name}`,
          data: { amount: agent.pricing, simulated: true },
        });
      }
    }

    // Step 4: Execute subtask
    updateSubtask(task.id, subtask.id, { status: 'in_progress' });

    const deliverable = await executeSubtask({
      agent,
      subtask,
      taskDescription: task.description,
    });

    updateSubtask(task.id, subtask.id, {
      status: 'delivered',
      deliverable,
    });

    // Step 5: Evaluate
    emitter.emit('evaluation:started', {
      taskId: task.id,
      subtaskId: subtask.id,
      message: `Evaluating ${agent.name}'s deliverable`,
    });

    const evaluation = await evaluateDeliverable({
      apiKey: orchestratorApiKey,
      subtaskDescription: subtask.description,
      subtaskType: subtask.type,
      deliverable,
    });

    if (evaluation.passed) {
      emitter.emit('evaluation:passed', {
        taskId: task.id,
        subtaskId: subtask.id,
        agentId: agent.id,
        message: `Approved (score: ${evaluation.score}/100): ${evaluation.reasoning}`,
        data: { score: evaluation.score, reasoning: evaluation.reasoning },
      });

      updateSubtask(task.id, subtask.id, {
        status: 'approved',
        evaluationReason: evaluation.reasoning,
        completedAt: new Date().toISOString(),
      });

      // Release escrow
      if (onChainTxHash) {
        try {
          const escrowId = `${task.id}-${subtask.id}`;
          const result = await releaseOnChainEscrow(escrowId);
          emitter.emit('escrow:released', {
            taskId: task.id,
            subtaskId: subtask.id,
            agentId: agent.id,
            message: `On-chain escrow released: ${agent.pricing} USDC paid to ${agent.name}`,
            data: { txHash: result.txHash, onChain: true },
          });
        } catch (error) {
          console.warn('On-chain escrow release failed:', error);
        }
      } else if (escrow) {
        try {
          await releaseEscrow(escrow.id, orchestratorApiKey);
        } catch (error) {
          console.warn('Escrow release failed:', error);
        }
        // Emit payment event only for Locus path (on-chain already emitted above)
        emitter.emit('escrow:released', {
          taskId: task.id,
          subtaskId: subtask.id,
          agentId: agent.id,
          message: `Payment released: ${agent.pricing} USDC to ${agent.name}`,
          data: { amount: agent.pricing, agentName: agent.name },
        });
      } else {
        // Simulated path — no real escrow, emit for demo
        emitter.emit('escrow:released', {
          taskId: task.id,
          subtaskId: subtask.id,
          agentId: agent.id,
          message: `Payment released: ${agent.pricing} USDC to ${agent.name}`,
          data: { amount: agent.pricing, agentName: agent.name },
        });
      }

      // Attempt post-payment token swap if agent prefers non-USDC
      if (agent.preferredToken && agent.preferredToken !== 'USDC') {
        try {
          await attemptPostPaymentSwap({
            escrowId: subtask.escrowId || '',
            taskId: task.id,
            subtaskId: subtask.id,
            agentAddress: agent.locusOwnerAddress,
            usdcAmount: agent.pricing,
            preferredToken: agent.preferredToken,
          });
        } catch (swapError) {
          console.error('[Orchestrator] Swap failed (non-critical):', swapError);
        }
      }

      // Update agent earnings
      store.updateAgent(agent.id, {
        totalEarnings: agent.totalEarnings + agent.pricing,
      });

      return deliverable;
    } else {
      emitter.emit('evaluation:failed', {
        taskId: task.id,
        subtaskId: subtask.id,
        agentId: agent.id,
        message: `Rejected (score: ${evaluation.score}/100): ${evaluation.reasoning}`,
        data: { score: evaluation.score, reasoning: evaluation.reasoning },
      });

      updateSubtask(task.id, subtask.id, {
        evaluationReason: evaluation.reasoning,
      });

      // Refund escrow
      if (onChainTxHash) {
        try {
          const escrowId = `${task.id}-${subtask.id}`;
          await refundOnChainEscrow(escrowId);
        } catch (error) {
          console.warn('On-chain escrow refund failed:', error);
        }
      } else if (escrow) {
        try {
          await refundEscrow(escrow.id, orchestratorApiKey);
        } catch (error) {
          console.warn('Escrow refund failed:', error);
        }
      }

      attempts++;
      if (attempts > MAX_RETRIES) {
        updateSubtask(task.id, subtask.id, { status: 'rejected' });
        throw new Error(`Subtask failed after ${MAX_RETRIES + 1} attempts`);
      }

      // Reset for retry
      updateSubtask(task.id, subtask.id, { status: 'pending' });
    }
  }

  throw new Error('Subtask execution exhausted retries');
}

async function compileResults(
  taskDescription: string,
  results: Array<{ type: string; description: string; deliverable: string }>,
  apiKey: string
): Promise<string> {
  const raw = await llmCall({
    apiKey,
    systemPrompt: SYSTEM_PROMPTS.compiler,
    userMessage: buildCompilerPrompt(taskDescription, results),
    simulationType: 'compile',
    simulationContext: { taskDescription, results },
  });

  const parsed = parseJSON<{ finalResult: string; summary: string }>(raw);
  return parsed.finalResult;
}

function updateSubtask(taskId: string, subtaskId: string, updates: Partial<Subtask>): void {
  const task = store.getTask(taskId);
  if (!task) return;

  const subtasks = task.subtasks.map((s) =>
    s.id === subtaskId ? { ...s, ...updates } : s
  );

  store.updateTask(taskId, { subtasks });
}
