import { describe, it, expect } from 'vitest';

import {
  SYSTEM_PROMPTS,
  buildDecompositionPrompt,
  buildEvaluationPrompt,
  buildSpecialistPrompt,
  buildCompilerPrompt,
} from '@/lib/llm/prompts';

// ── SYSTEM_PROMPTS ─────────────────────────────────────────────────────────

describe('SYSTEM_PROMPTS', () => {
  it('decomposer prompt contains JSON format instruction', () => {
    expect(SYSTEM_PROMPTS.decomposer).toContain('JSON');
  });

  it('decomposer prompt mentions subtask types: code, research, copy', () => {
    expect(SYSTEM_PROMPTS.decomposer).toContain('code');
    expect(SYSTEM_PROMPTS.decomposer).toContain('research');
    expect(SYSTEM_PROMPTS.decomposer).toContain('copy');
  });

  it('evaluator prompt contains passing threshold', () => {
    expect(SYSTEM_PROMPTS.evaluator).toContain('50');
  });

  it('evaluator prompt contains JSON format instruction', () => {
    expect(SYSTEM_PROMPTS.evaluator).toContain('JSON');
  });

  it('evaluator prompt contains passed field', () => {
    expect(SYSTEM_PROMPTS.evaluator).toContain('passed');
  });

  it('codeAgent prompt contains JSON format instruction', () => {
    expect(SYSTEM_PROMPTS.codeAgent).toContain('JSON');
  });

  it('codeAgent prompt contains deliverable field', () => {
    expect(SYSTEM_PROMPTS.codeAgent).toContain('deliverable');
  });

  it('researchAgent prompt contains JSON format instruction', () => {
    expect(SYSTEM_PROMPTS.researchAgent).toContain('JSON');
  });

  it('researchAgent prompt contains deliverable field', () => {
    expect(SYSTEM_PROMPTS.researchAgent).toContain('deliverable');
  });

  it('copyAgent prompt contains JSON format instruction', () => {
    expect(SYSTEM_PROMPTS.copyAgent).toContain('JSON');
  });

  it('copyAgent prompt contains deliverable field', () => {
    expect(SYSTEM_PROMPTS.copyAgent).toContain('deliverable');
  });

  it('compiler prompt contains JSON format instruction', () => {
    expect(SYSTEM_PROMPTS.compiler).toContain('JSON');
  });

  it('compiler prompt contains finalResult field', () => {
    expect(SYSTEM_PROMPTS.compiler).toContain('finalResult');
  });

  it('all required keys exist', () => {
    const keys = ['decomposer', 'evaluator', 'codeAgent', 'researchAgent', 'copyAgent', 'compiler'];
    for (const key of keys) {
      expect(SYSTEM_PROMPTS).toHaveProperty(key);
    }
  });
});

// ── buildDecompositionPrompt ───────────────────────────────────────────────

describe('buildDecompositionPrompt()', () => {
  it('includes the task description in the output', () => {
    const prompt = buildDecompositionPrompt('Build a SaaS landing page');
    expect(prompt).toContain('Build a SaaS landing page');
  });

  it('contains the word "Task"', () => {
    const prompt = buildDecompositionPrompt('Some task');
    expect(prompt).toContain('Task');
  });

  it('works with an empty description', () => {
    const prompt = buildDecompositionPrompt('');
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('works with a multiline description', () => {
    const description = 'Line 1\nLine 2\nLine 3';
    const prompt = buildDecompositionPrompt(description);
    expect(prompt).toContain('Line 1');
    expect(prompt).toContain('Line 3');
  });

  it('returns a non-empty string', () => {
    const prompt = buildDecompositionPrompt('anything');
    expect(prompt.trim().length).toBeGreaterThan(0);
  });
});

// ── buildEvaluationPrompt ─────────────────────────────────────────────────

describe('buildEvaluationPrompt()', () => {
  it('includes subtask description', () => {
    const prompt = buildEvaluationPrompt('Write a React button', 'code', 'const Button = () => <button/>;');
    expect(prompt).toContain('Write a React button');
  });

  it('includes subtask type', () => {
    const prompt = buildEvaluationPrompt('Do research', 'research', 'Report content here');
    expect(prompt).toContain('research');
  });

  it('includes the deliverable', () => {
    const prompt = buildEvaluationPrompt('Write copy', 'copy', 'Amazing tagline here!');
    expect(prompt).toContain('Amazing tagline here!');
  });

  it('includes all three arguments', () => {
    const prompt = buildEvaluationPrompt('desc', 'code', 'deliverable content');
    expect(prompt).toContain('desc');
    expect(prompt).toContain('code');
    expect(prompt).toContain('deliverable content');
  });

  it('returns a string containing Subtask keyword', () => {
    const prompt = buildEvaluationPrompt('do something', 'copy', 'output');
    expect(prompt).toContain('Subtask');
  });

  it('handles long deliverables without truncating', () => {
    const longDeliverable = 'x'.repeat(5000);
    const prompt = buildEvaluationPrompt('task', 'code', longDeliverable);
    expect(prompt).toContain(longDeliverable);
  });
});

// ── buildSpecialistPrompt ─────────────────────────────────────────────────

describe('buildSpecialistPrompt()', () => {
  it('includes subtask description', () => {
    const prompt = buildSpecialistPrompt('Build a login form', 'Create a React app');
    expect(prompt).toContain('Build a login form');
  });

  it('includes task context', () => {
    const prompt = buildSpecialistPrompt('Write button', 'SaaS dashboard project');
    expect(prompt).toContain('SaaS dashboard project');
  });

  it('contains instruction to produce best work', () => {
    const prompt = buildSpecialistPrompt('anything', 'context');
    expect(prompt.toLowerCase()).toContain('best work');
  });

  it('works with empty context', () => {
    const prompt = buildSpecialistPrompt('Do the task', '');
    expect(prompt).toContain('Do the task');
  });

  it('returns a non-empty string', () => {
    const prompt = buildSpecialistPrompt('subtask', 'context');
    expect(prompt.trim().length).toBeGreaterThan(0);
  });
});

// ── buildCompilerPrompt ────────────────────────────────────────────────────

describe('buildCompilerPrompt()', () => {
  const results = [
    { type: 'research', description: 'Research AI trends', deliverable: '# AI Trends Report\nKey findings...' },
    { type: 'code', description: 'Build dashboard', deliverable: 'const Dashboard = () => <div/>;' },
    { type: 'copy', description: 'Write tagline', deliverable: 'Transform your business with AI!' },
  ];

  it('includes the original task description', () => {
    const prompt = buildCompilerPrompt('Build a full-stack app', results);
    expect(prompt).toContain('Build a full-stack app');
  });

  it('includes each agent type in the output', () => {
    const prompt = buildCompilerPrompt('task', results);
    expect(prompt).toContain('research');
    expect(prompt).toContain('code');
    expect(prompt).toContain('copy');
  });

  it('includes each deliverable', () => {
    const prompt = buildCompilerPrompt('task', results);
    expect(prompt).toContain('AI Trends Report');
    expect(prompt).toContain('const Dashboard');
    expect(prompt).toContain('Transform your business');
  });

  it('includes each subtask description', () => {
    const prompt = buildCompilerPrompt('task', results);
    expect(prompt).toContain('Research AI trends');
    expect(prompt).toContain('Build dashboard');
    expect(prompt).toContain('Write tagline');
  });

  it('handles empty results array', () => {
    const prompt = buildCompilerPrompt('Empty task', []);
    expect(prompt).toContain('Empty task');
    expect(typeof prompt).toBe('string');
  });

  it('handles single result', () => {
    const single = [{ type: 'code', description: 'Single task', deliverable: 'output' }];
    const prompt = buildCompilerPrompt('Single', single);
    expect(prompt).toContain('Single');
    expect(prompt).toContain('output');
  });

  it('numbers agents starting from 1', () => {
    const prompt = buildCompilerPrompt('task', results);
    expect(prompt).toContain('Agent 1');
    expect(prompt).toContain('Agent 2');
    expect(prompt).toContain('Agent 3');
  });

  it('returns a non-empty string', () => {
    const prompt = buildCompilerPrompt('task', results);
    expect(prompt.trim().length).toBeGreaterThan(0);
  });
});
