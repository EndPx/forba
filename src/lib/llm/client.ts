import { LLMMessage } from '../types';
import { wrappedOpenAICall } from '../payments/locus';
import { config } from '../config';
import { isSimulationMode } from './simulator';

export interface LLMCallOptions {
  apiKey: string;
  systemPrompt: string;
  userMessage: string;
  model?: string;
  jsonMode?: boolean;
  // Simulation context
  simulationType?: 'decompose' | 'specialist' | 'evaluate' | 'compile';
  simulationContext?: Record<string, unknown>;
}

export async function llmCall(options: LLMCallOptions): Promise<string> {
  const { apiKey, systemPrompt, userMessage, model, jsonMode = true, simulationType, simulationContext } = options;

  // If no API keys available, use simulation mode
  if (isSimulationMode() && simulationType) {
    const sim = await import('./simulator');
    switch (simulationType) {
      case 'decompose':
        return sim.simulateDecomposition(simulationContext?.taskDescription as string || userMessage);
      case 'specialist':
        return sim.simulateSpecialist(
          simulationContext?.subtaskType as 'code' | 'research' | 'copy',
          simulationContext?.subtaskDescription as string || userMessage,
          simulationContext?.taskContext as string || ''
        );
      case 'evaluate':
        return sim.simulateEvaluation(
          simulationContext?.subtaskDescription as string || '',
          simulationContext?.deliverable as string || ''
        );
      case 'compile':
        return sim.simulateCompilation(
          simulationContext?.taskDescription as string || '',
          simulationContext?.results as Array<{ type: string; description: string; deliverable: string }> || []
        );
    }
  }

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  try {
    const result = await wrappedOpenAICall(
      apiKey,
      messages,
      model || config.llmModel,
      jsonMode
    );
    return result;
  } catch (error) {
    // Fallback: try direct OpenAI if Locus wrapped API fails
    console.error('Locus wrapped API failed, trying direct OpenAI:', error);
    return directOpenAICall(messages, model || config.llmModel, jsonMode);
  }
}

async function directOpenAICall(
  messages: LLMMessage[],
  model: string,
  jsonMode: boolean
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Final fallback: simulation mode even without explicit simulationType
    console.warn('No OpenAI API key — falling back to simulation mode');
    const sim = await import('./simulator');
    return sim.simulateDecomposition('general task');
  }

  const body: Record<string, unknown> = { model, messages };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content || '';
}

export function parseJSON<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim()) as T;
    }
    throw new Error(`Failed to parse LLM response as JSON: ${raw.substring(0, 200)}...`);
  }
}
