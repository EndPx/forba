import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock external dependencies before imports
vi.mock('@/lib/payments/locus', () => ({
  wrappedOpenAICall: vi.fn(),
}));

vi.mock('@/lib/llm/simulator', () => ({
  isSimulationMode: vi.fn(() => false),
  simulateDecomposition: vi.fn().mockResolvedValue('{"subtasks":[]}'),
  simulateSpecialist: vi.fn().mockResolvedValue('{"deliverable":"sim","summary":"done"}'),
  simulateEvaluation: vi.fn().mockResolvedValue('{"passed":true,"score":80,"reasoning":"ok"}'),
  simulateCompilation: vi.fn().mockResolvedValue('{"finalResult":"compiled"}'),
}));

import { llmCall, parseJSON } from '@/lib/llm/client';
import { wrappedOpenAICall } from '@/lib/payments/locus';
import { isSimulationMode, simulateDecomposition, simulateSpecialist } from '@/lib/llm/simulator';

const mockWrapped = vi.mocked(wrappedOpenAICall);
const mockIsSimulation = vi.mocked(isSimulationMode);
const mockSimDecompose = vi.mocked(simulateDecomposition);
const mockSimSpecialist = vi.mocked(simulateSpecialist);

beforeEach(() => {
  vi.clearAllMocks();
  mockIsSimulation.mockReturnValue(false);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ──────────────────────────────────────────────────────────────────────────────
// llmCall — simulation routing
// ──────────────────────────────────────────────────────────────────────────────
describe('llmCall() simulation routing', () => {
  it('routes to simulateDecomposition when in sim mode with decompose type', async () => {
    mockIsSimulation.mockReturnValue(true);
    mockSimDecompose.mockResolvedValueOnce('{"subtasks":[{"description":"t","type":"code","estimatedComplexity":"low"}]}');

    const result = await llmCall({
      apiKey: 'mock-key',
      systemPrompt: 'sys',
      userMessage: 'user',
      simulationType: 'decompose',
      simulationContext: { taskDescription: 'Build app' },
    });

    expect(mockSimDecompose).toHaveBeenCalledWith('Build app');
    expect(mockWrapped).not.toHaveBeenCalled();
    expect(result).toContain('subtasks');
  });

  it('routes to simulateSpecialist when in sim mode with specialist type', async () => {
    mockIsSimulation.mockReturnValue(true);
    mockSimSpecialist.mockResolvedValueOnce('{"deliverable":"code output","summary":"done"}');

    await llmCall({
      apiKey: 'mock-key',
      systemPrompt: 'sys',
      userMessage: 'write code',
      simulationType: 'specialist',
      simulationContext: { subtaskType: 'code', subtaskDescription: 'write a button', taskContext: 'React app' },
    });

    expect(mockSimSpecialist).toHaveBeenCalledWith('code', 'write a button', 'React app');
  });

  it('calls wrappedOpenAICall when not in simulation mode', async () => {
    mockIsSimulation.mockReturnValue(false);
    mockWrapped.mockResolvedValueOnce('{"result":"real"}');

    const result = await llmCall({
      apiKey: 'real-key',
      systemPrompt: 'sys',
      userMessage: 'user msg',
    });

    expect(mockWrapped).toHaveBeenCalledOnce();
    expect(result).toBe('{"result":"real"}');
  });

  it('does not simulate when simulationType is not provided even in sim mode', async () => {
    mockIsSimulation.mockReturnValue(true);
    mockWrapped.mockResolvedValueOnce('{"fallback":true}');

    // No simulationType — should try real API first
    await llmCall({
      apiKey: 'key',
      systemPrompt: 'sys',
      userMessage: 'msg',
      // no simulationType
    });

    // Falls through to wrappedOpenAICall
    expect(mockWrapped).toHaveBeenCalledOnce();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// llmCall — fallback to directOpenAI
// ──────────────────────────────────────────────────────────────────────────────
describe('llmCall() fallback behavior', () => {
  it('falls back to simulation when Locus fails and no OPENAI_API_KEY', async () => {
    mockIsSimulation.mockReturnValue(false);
    mockWrapped.mockRejectedValueOnce(new Error('Locus unavailable'));
    vi.stubEnv('OPENAI_API_KEY', '');
    mockSimDecompose.mockResolvedValueOnce('{"subtasks":[]}');

    // Should not throw — falls back
    const result = await llmCall({
      apiKey: 'key',
      systemPrompt: 'sys',
      userMessage: 'msg',
    });

    expect(typeof result).toBe('string');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// llmCall — directOpenAI fallback path (lines 65-98)
// ──────────────────────────────────────────────────────────────────────────────
describe('llmCall() directOpenAI path', () => {
  it('calls OpenAI directly when Locus fails and OPENAI_API_KEY is set', async () => {
    mockIsSimulation.mockReturnValue(false);
    mockWrapped.mockRejectedValueOnce(new Error('Locus down'));
    vi.stubEnv('OPENAI_API_KEY', 'sk-real-openai-key');

    const openAIResponse = {
      choices: [{ message: { content: '{"result":"from openai"}' } }],
    };
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(openAIResponse),
      text: () => Promise.resolve(JSON.stringify(openAIResponse)),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await llmCall({
      apiKey: 'locus-key',
      systemPrompt: 'sys',
      userMessage: 'user msg',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-real-openai-key',
        }),
      })
    );
    expect(result).toBe('{"result":"from openai"}');
  });

  it('sends json_object response_format when jsonMode is true (default)', async () => {
    mockIsSimulation.mockReturnValue(false);
    mockWrapped.mockRejectedValueOnce(new Error('Locus down'));
    vi.stubEnv('OPENAI_API_KEY', 'sk-test-key');

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: '{}' } }] }),
      text: () => Promise.resolve(''),
    });
    vi.stubGlobal('fetch', mockFetch);

    await llmCall({
      apiKey: 'key',
      systemPrompt: 'sys',
      userMessage: 'msg',
      jsonMode: true,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('does not send response_format when jsonMode is false', async () => {
    mockIsSimulation.mockReturnValue(false);
    mockWrapped.mockRejectedValueOnce(new Error('Locus down'));
    vi.stubEnv('OPENAI_API_KEY', 'sk-test-key');

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'plain text' } }] }),
      text: () => Promise.resolve(''),
    });
    vi.stubGlobal('fetch', mockFetch);

    await llmCall({
      apiKey: 'key',
      systemPrompt: 'sys',
      userMessage: 'msg',
      jsonMode: false,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.response_format).toBeUndefined();
  });

  it('throws when OpenAI API returns a non-OK response', async () => {
    mockIsSimulation.mockReturnValue(false);
    mockWrapped.mockRejectedValueOnce(new Error('Locus down'));
    vi.stubEnv('OPENAI_API_KEY', 'sk-bad-key');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    }));

    await expect(llmCall({
      apiKey: 'key',
      systemPrompt: 'sys',
      userMessage: 'msg',
    })).rejects.toThrow('OpenAI API error 401');
  });

  it('returns empty string when choices array is empty', async () => {
    mockIsSimulation.mockReturnValue(false);
    mockWrapped.mockRejectedValueOnce(new Error('Locus down'));
    vi.stubEnv('OPENAI_API_KEY', 'sk-test-key');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ choices: [] }),
      text: () => Promise.resolve(''),
    }));

    const result = await llmCall({
      apiKey: 'key',
      systemPrompt: 'sys',
      userMessage: 'msg',
    });

    expect(result).toBe('');
  });

  it('uses custom model when provided', async () => {
    mockIsSimulation.mockReturnValue(false);
    mockWrapped.mockRejectedValueOnce(new Error('Locus down'));
    vi.stubEnv('OPENAI_API_KEY', 'sk-test-key');

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] }),
      text: () => Promise.resolve(''),
    });
    vi.stubGlobal('fetch', mockFetch);

    await llmCall({
      apiKey: 'key',
      systemPrompt: 'sys',
      userMessage: 'msg',
      model: 'gpt-4-turbo',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('gpt-4-turbo');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// parseJSON
// ──────────────────────────────────────────────────────────────────────────────
describe('parseJSON()', () => {
  it('parses valid JSON string', () => {
    const result = parseJSON<{ key: string }>('{"key":"value"}');
    expect(result.key).toBe('value');
  });

  it('parses JSON wrapped in markdown code block', () => {
    const raw = '```json\n{"answer":42}\n```';
    const result = parseJSON<{ answer: number }>(raw);
    expect(result.answer).toBe(42);
  });

  it('parses JSON wrapped in plain markdown block (no "json" label)', () => {
    const raw = '```\n{"x":true}\n```';
    const result = parseJSON<{ x: boolean }>(raw);
    expect(result.x).toBe(true);
  });

  it('throws on invalid JSON that cannot be extracted', () => {
    expect(() => parseJSON('not json at all')).toThrow('Failed to parse LLM response');
  });

  it('handles nested objects', () => {
    const json = '{"subtasks":[{"type":"code","description":"Write it"}]}';
    const result = parseJSON<{ subtasks: Array<{ type: string; description: string }> }>(json);
    expect(result.subtasks).toHaveLength(1);
    expect(result.subtasks[0].type).toBe('code');
  });

  it('handles arrays at top level', () => {
    const result = parseJSON<number[]>('[1,2,3]');
    expect(result).toEqual([1, 2, 3]);
  });
});
