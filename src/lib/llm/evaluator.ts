import { EvaluationResult } from '../types';
import { llmCall, parseJSON } from './client';
import { SYSTEM_PROMPTS, buildEvaluationPrompt } from './prompts';

export async function evaluateDeliverable(params: {
  apiKey: string;
  subtaskDescription: string;
  subtaskType: string;
  deliverable: string;
}): Promise<EvaluationResult> {
  const { apiKey, subtaskDescription, subtaskType, deliverable } = params;

  const raw = await llmCall({
    apiKey,
    systemPrompt: SYSTEM_PROMPTS.evaluator,
    userMessage: buildEvaluationPrompt(subtaskDescription, subtaskType, deliverable),
  });

  const result = parseJSON<EvaluationResult>(raw);

  // Ensure passed aligns with score
  result.passed = result.score >= 50;

  return result;
}
