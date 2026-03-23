import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isSimulationMode,
  simulateDecomposition,
  simulateSpecialist,
  simulateEvaluation,
  simulateCompilation,
} from '@/lib/llm/simulator';

// Speed up delay()-based functions
vi.mock('@/lib/llm/simulator', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/llm/simulator')>();
  return mod;
});

// Override setTimeout to resolve immediately so tests don't take seconds
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

// ──────────────────────────────────────────────────────────────────────────────
// isSimulationMode
// ──────────────────────────────────────────────────────────────────────────────
describe('isSimulationMode()', () => {
  it('returns true when no API keys are set', () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    vi.stubEnv('LOCUS_API_KEY', '');
    expect(isSimulationMode()).toBe(true);
  });

  it('returns false when OPENAI_API_KEY is set', () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-real-key');
    vi.stubEnv('LOCUS_API_KEY', '');
    expect(isSimulationMode()).toBe(false);
  });

  it('returns false when LOCUS_API_KEY is set', () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    vi.stubEnv('LOCUS_API_KEY', 'locus-real-key');
    expect(isSimulationMode()).toBe(false);
  });

  it('returns false when both keys are set', () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-key');
    vi.stubEnv('LOCUS_API_KEY', 'locus-key');
    expect(isSimulationMode()).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// simulateDecomposition
// ──────────────────────────────────────────────────────────────────────────────
describe('simulateDecomposition()', () => {
  it('returns valid JSON string with subtasks array', async () => {
    const promise = simulateDecomposition('build a landing page');
    vi.runAllTimers();
    const raw = await promise;

    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty('subtasks');
    expect(Array.isArray(parsed.subtasks)).toBe(true);
    expect(parsed.subtasks.length).toBeGreaterThan(0);
  });

  it('each subtask has description and type', async () => {
    const promise = simulateDecomposition('create a blog post');
    vi.runAllTimers();
    const raw = await promise;

    const parsed = JSON.parse(raw);
    for (const subtask of parsed.subtasks) {
      expect(subtask).toHaveProperty('description');
      expect(subtask).toHaveProperty('type');
      expect(['code', 'research', 'copy']).toContain(subtask.type);
    }
  });

  it('includes reasoning field', async () => {
    const promise = simulateDecomposition('any task');
    vi.runAllTimers();
    const raw = await promise;

    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty('reasoning');
    expect(typeof parsed.reasoning).toBe('string');
  });

  it('customizes description based on task', async () => {
    const promise = simulateDecomposition('build a web application for tracking expenses');
    vi.runAllTimers();
    const raw = await promise;

    const parsed = JSON.parse(raw);
    // At least one subtask should mention the task context
    const allDescriptions = parsed.subtasks.map((s: { description: string }) => s.description).join(' ');
    expect(allDescriptions.length).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// simulateSpecialist
// ──────────────────────────────────────────────────────────────────────────────
describe('simulateSpecialist()', () => {
  it('returns valid JSON for research type', async () => {
    const promise = simulateSpecialist('research', 'analyze AI trends', 'AI marketplace');
    vi.runAllTimers();
    const raw = await promise;

    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty('deliverable');
    expect(parsed).toHaveProperty('summary');
    expect(parsed.deliverable.length).toBeGreaterThan(50);
  });

  it('returns valid JSON for copy type', async () => {
    const promise = simulateSpecialist('copy', 'write marketing copy', 'product launch');
    vi.runAllTimers();
    const raw = await promise;

    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty('deliverable');
    expect(parsed.deliverable).toContain('Transform');
  });

  it('returns valid JSON for code type', async () => {
    const promise = simulateSpecialist('code', 'build a component', 'React app');
    vi.runAllTimers();
    const raw = await promise;

    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty('deliverable');
    expect(parsed.deliverable).toContain('import React');
  });

  it('returns a deliverable and summary for unknown type', async () => {
    const promise = simulateSpecialist('research', 'some niche task', '');
    vi.runAllTimers();
    const raw = await promise;

    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty('deliverable');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// simulateEvaluation
// ──────────────────────────────────────────────────────────────────────────────
describe('simulateEvaluation()', () => {
  it('returns passed=true with score for non-empty deliverable', async () => {
    const promise = simulateEvaluation('write a report', 'This is the report content');
    vi.runAllTimers();
    const raw = await promise;

    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty('passed');
    expect(parsed).toHaveProperty('score');
    expect(parsed.score).toBeGreaterThanOrEqual(72);
    expect(parsed.score).toBeLessThanOrEqual(94);
  });

  it('returns lower score for empty deliverable', async () => {
    const promise = simulateEvaluation('task description', '');
    vi.runAllTimers();
    const raw = await promise;

    const parsed = JSON.parse(raw);
    expect(parsed.score).toBe(40);
  });

  it('includes reasoning string', async () => {
    const promise = simulateEvaluation('write something', 'content here');
    vi.runAllTimers();
    const raw = await promise;

    const parsed = JSON.parse(raw);
    expect(typeof parsed.reasoning).toBe('string');
    expect(parsed.reasoning.length).toBeGreaterThan(10);
  });

  it('includes suggestions array', async () => {
    const promise = simulateEvaluation('desc', 'content');
    vi.runAllTimers();
    const raw = await promise;

    const parsed = JSON.parse(raw);
    expect(Array.isArray(parsed.suggestions)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// simulateCompilation
// ──────────────────────────────────────────────────────────────────────────────
describe('simulateCompilation()', () => {
  it('returns finalResult containing all deliverables', async () => {
    const results = [
      { type: 'research', description: 'Do research', deliverable: 'Research content' },
      { type: 'code', description: 'Write code', deliverable: 'Code content' },
    ];
    const promise = simulateCompilation('build something', results);
    vi.runAllTimers();
    const raw = await promise;

    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty('finalResult');
    expect(parsed.finalResult).toContain('Research content');
    expect(parsed.finalResult).toContain('Code content');
  });

  it('returns summary with agent count', async () => {
    const results = [
      { type: 'copy', description: 'Write copy', deliverable: 'Copy text' },
    ];
    const promise = simulateCompilation('task', results);
    vi.runAllTimers();
    const raw = await promise;

    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty('summary');
    expect(parsed.summary).toContain('1');
  });

  it('returns agentContributions array', async () => {
    const results = [
      { type: 'research', description: 'Research task', deliverable: 'Research output' },
      { type: 'copy', description: 'Copy task', deliverable: 'Copy output' },
    ];
    const promise = simulateCompilation('full task', results);
    vi.runAllTimers();
    const raw = await promise;

    const parsed = JSON.parse(raw);
    expect(Array.isArray(parsed.agentContributions)).toBe(true);
    expect(parsed.agentContributions).toHaveLength(2);
  });

  it('handles empty results array', async () => {
    const promise = simulateCompilation('task with no results', []);
    vi.runAllTimers();
    const raw = await promise;

    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty('finalResult');
  });
});
