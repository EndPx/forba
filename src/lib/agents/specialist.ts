import { Agent, Subtask, SubtaskType } from '../types';
import { llmCall, parseJSON } from '../llm/client';
import { SYSTEM_PROMPTS, buildSpecialistPrompt } from '../llm/prompts';
import { emitter } from '../events/emitter';
import { store } from '../store';

interface SpecialistResult {
  deliverable: string;
  summary: string;
}

const SPECIALIST_PROMPTS: Record<SubtaskType, string> = {
  code: SYSTEM_PROMPTS.codeAgent,
  research: SYSTEM_PROMPTS.researchAgent,
  copy: SYSTEM_PROMPTS.copyAgent,
};

export async function executeSubtask(params: {
  agent: Agent;
  subtask: Subtask;
  taskDescription: string;
}): Promise<string> {
  const { agent, subtask, taskDescription } = params;

  // Update agent status
  store.updateAgent(agent.id, { status: 'working' });

  emitter.emit('agent:working', {
    taskId: subtask.taskId,
    subtaskId: subtask.id,
    agentId: agent.id,
    message: `${agent.name} is working on: ${subtask.description}`,
  });

  try {
    const systemPrompt = SPECIALIST_PROMPTS[subtask.type];
    const userMessage = buildSpecialistPrompt(subtask.description, taskDescription);

    const raw = await llmCall({
      apiKey: agent.locusApiKey,
      systemPrompt,
      userMessage,
    });

    const result = parseJSON<SpecialistResult>(raw);

    // Update agent status back to idle
    store.updateAgent(agent.id, {
      status: 'idle',
      tasksCompleted: agent.tasksCompleted + 1,
    });

    emitter.emit('agent:delivered', {
      taskId: subtask.taskId,
      subtaskId: subtask.id,
      agentId: agent.id,
      message: `${agent.name} delivered: ${result.summary}`,
      data: { deliverablePreview: result.deliverable.substring(0, 200) },
    });

    return result.deliverable;
  } catch (error) {
    store.updateAgent(agent.id, { status: 'idle' });

    emitter.emit('system:error', {
      taskId: subtask.taskId,
      subtaskId: subtask.id,
      agentId: agent.id,
      message: `${agent.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });

    throw error;
  }
}
