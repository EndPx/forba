import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock llmCall so evaluator doesn't make real API calls
vi.mock('@/lib/llm/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/llm/client')>();
  return {
    ...actual,
    llmCall: vi.fn(),
  };
});

import { evaluateDeliverable } from '@/lib/llm/evaluator';
import { llmCall } from '@/lib/llm/client';

const mockLlmCall = vi.mocked(llmCall);

beforeEach(() => {
  vi.clearAllMocks();
});

// ──────────────────────────────────────────────────────────────────────────────
// evaluateDeliverable
// ──────────────────────────────────────────────────────────────────────────────
describe('evaluateDeliverable()', () => {
  it('returns passed=true when score >= 50', async () => {
    mockLlmCall.mockResolvedValueOnce(
      JSON.stringify({ passed: true, score: 85, reasoning: 'Great work', suggestions: [] })
    );

    const result = await evaluateDeliverable({
      apiKey: 'key',
      subtaskDescription: 'Write a React component',
      subtaskType: 'code',
      deliverable: 'const Button = () => <button>Click</button>;',
    });

    expect(result.passed).toBe(true);
    expect(result.score).toBe(85);
    expect(result.reasoning).toBe('Great work');
  });

  it('returns passed=false when score < 50', async () => {
    mockLlmCall.mockResolvedValueOnce(
      JSON.stringify({ passed: false, score: 30, reasoning: 'Poor quality' })
    );

    const result = await evaluateDeliverable({
      apiKey: 'key',
      subtaskDescription: 'Write research report',
      subtaskType: 'research',
      deliverable: 'short',
    });

    expect(result.passed).toBe(false);
    expect(result.score).toBe(30);
  });

  it('corrects passed field based on score (score=50 -> passed=true)', async () => {
    // LLM says passed=false but score=50 — our logic overrides
    mockLlmCall.mockResolvedValueOnce(
      JSON.stringify({ passed: false, score: 50, reasoning: 'Borderline' })
    );

    const result = await evaluateDeliverable({
      apiKey: 'key',
      subtaskDescription: 'Write copy',
      subtaskType: 'copy',
      deliverable: 'Some marketing copy',
    });

    expect(result.passed).toBe(true); // score >= 50 forces passed=true
  });

  it('corrects passed field based on score (score=49 -> passed=false)', async () => {
    // LLM says passed=true but score=49 — our logic overrides
    mockLlmCall.mockResolvedValueOnce(
      JSON.stringify({ passed: true, score: 49, reasoning: 'Almost there' })
    );

    const result = await evaluateDeliverable({
      apiKey: 'key',
      subtaskDescription: 'Write copy',
      subtaskType: 'copy',
      deliverable: 'content',
    });

    expect(result.passed).toBe(false); // score < 50 forces passed=false
  });

  it('passes correct params to llmCall (evaluate simulationType)', async () => {
    mockLlmCall.mockResolvedValueOnce(
      JSON.stringify({ passed: true, score: 75, reasoning: 'Good' })
    );

    await evaluateDeliverable({
      apiKey: 'my-key',
      subtaskDescription: 'Do research',
      subtaskType: 'research',
      deliverable: 'Research output',
    });

    expect(mockLlmCall).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'my-key',
        simulationType: 'evaluate',
        simulationContext: expect.objectContaining({
          subtaskDescription: 'Do research',
          subtaskType: 'research',
          deliverable: 'Research output',
        }),
      })
    );
  });

  it('includes suggestions when provided by LLM', async () => {
    mockLlmCall.mockResolvedValueOnce(
      JSON.stringify({
        passed: true,
        score: 90,
        reasoning: 'Excellent',
        suggestions: ['Add more examples', 'Improve formatting'],
      })
    );

    const result = await evaluateDeliverable({
      apiKey: 'key',
      subtaskDescription: 'task',
      subtaskType: 'code',
      deliverable: 'content',
    });

    expect(result.suggestions).toEqual(['Add more examples', 'Improve formatting']);
  });
});
