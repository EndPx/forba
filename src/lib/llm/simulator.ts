/**
 * Simulation mode for Forba demo — generates realistic mock LLM responses
 * when no API keys are available. This allows the full orchestration flow
 * (decompose → hire → escrow → execute → evaluate → compile) to run end-to-end.
 */

import { SubtaskType } from '../types';

// Simulated delay to make it feel realistic
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const TASK_DECOMPOSITIONS: Record<string, Array<{ description: string; type: SubtaskType; estimatedComplexity: string }>> = {
  default: [
    { description: 'Research the topic, gather key facts, and analyze current trends', type: 'research', estimatedComplexity: 'medium' },
    { description: 'Write compelling copy and content based on research findings', type: 'copy', estimatedComplexity: 'medium' },
    { description: 'Build a polished implementation with clean code', type: 'code', estimatedComplexity: 'high' },
  ],
};

function detectTaskCategory(description: string): string {
  const lower = description.toLowerCase();
  if (lower.includes('landing page') || lower.includes('website') || lower.includes('web page')) return 'website';
  if (lower.includes('blog') || lower.includes('article') || lower.includes('post')) return 'blog';
  if (lower.includes('app') || lower.includes('application') || lower.includes('tool')) return 'app';
  return 'default';
}

export async function simulateDecomposition(taskDescription: string): Promise<string> {
  await delay(800 + Math.random() * 400);

  const category = detectTaskCategory(taskDescription);
  const subtasks = TASK_DECOMPOSITIONS[category] || TASK_DECOMPOSITIONS.default;

  // Customize descriptions based on actual task
  const customized = subtasks.map((s) => ({
    ...s,
    description: customizeDescription(s.description, s.type, taskDescription),
  }));

  return JSON.stringify({
    subtasks: customized,
    reasoning: `Decomposed "${taskDescription}" into ${customized.length} subtasks: research for context, copy for content, and code for implementation.`,
  });
}

function customizeDescription(template: string, type: SubtaskType, task: string): string {
  const taskShort = task.length > 60 ? task.substring(0, 60) + '...' : task;
  switch (type) {
    case 'research':
      return `Research and analyze key information related to: ${taskShort}`;
    case 'copy':
      return `Write professional content and copy for: ${taskShort}`;
    case 'code':
      return `Build the technical implementation for: ${taskShort}`;
    default:
      return template;
  }
}

export async function simulateSpecialist(
  subtaskType: SubtaskType,
  subtaskDescription: string,
  taskContext: string
): Promise<string> {
  await delay(1200 + Math.random() * 800);

  const topic = taskContext.substring(0, 80);

  switch (subtaskType) {
    case 'research':
      return JSON.stringify({
        deliverable: `# Research Report: ${topic}\n\n## Executive Summary\nComprehensive analysis of the key aspects related to "${topic}".\n\n## Key Findings\n\n### 1. Market Overview\n- The market for this area is growing at approximately 25% year-over-year\n- Key players include both established companies and emerging startups\n- There is significant demand for innovative solutions\n\n### 2. Technical Landscape\n- Modern approaches leverage AI/ML for automation\n- Cloud-native architectures are the standard\n- Security and privacy remain top concerns\n\n### 3. User Insights\n- Users prioritize ease of use and reliability\n- Integration capabilities are a key differentiator\n- Real-time feedback and transparency build trust\n\n## Recommendations\n1. Focus on user experience and simplicity\n2. Leverage automation where possible\n3. Build with security-first mindset\n4. Provide transparent, auditable operations\n\n## Conclusion\nThe opportunity is significant, with clear demand for well-executed solutions in this space.`,
        summary: `Comprehensive research report covering market overview, technical landscape, and user insights for ${topic}`,
        sources: ['Market analysis', 'Technical review', 'User research', 'Industry trends'],
      });

    case 'copy':
      return JSON.stringify({
        deliverable: `# Content for: ${topic}\n\n## Headline\n**Transform Your Workflow with Intelligent Automation**\n\n## Subheadline\nHarness the power of AI agents to streamline complex tasks, reduce costs, and deliver results faster than ever.\n\n## Key Messages\n\n### Value Proposition\nOur solution combines cutting-edge AI with blockchain-verified accountability. Every task is tracked, every payment is transparent, and every result is quality-assured.\n\n### How It Works\n1. **Submit** — Describe your task in natural language\n2. **Orchestrate** — AI breaks it down and assigns specialist agents\n3. **Execute** — Agents work autonomously with on-chain escrow\n4. **Deliver** — Quality-verified results with full audit trail\n\n### Call to Action\nReady to experience the future of work? Start your first task today and see AI agents collaborate in real-time.\n\n## SEO Description\nAI-powered task marketplace with autonomous agent coordination and blockchain-verified payments. Submit tasks, watch agents work, get quality results.`,
        summary: `Professional marketing copy including headline, value proposition, and CTA for ${topic}`,
        variations: ['Technical audience version', 'Executive summary version'],
      });

    case 'code':
      return JSON.stringify({
        deliverable: `// Implementation for: ${topic}\n\nimport React from 'react';\n\ninterface TaskResult {\n  id: string;\n  title: string;\n  status: 'pending' | 'active' | 'completed';\n  score: number;\n}\n\nexport function TaskResultCard({ result }: { result: TaskResult }) {\n  const statusColors = {\n    pending: 'bg-yellow-100 text-yellow-800',\n    active: 'bg-blue-100 text-blue-800',\n    completed: 'bg-green-100 text-green-800',\n  };\n\n  return (\n    <div className="rounded-lg border p-4 hover:shadow-md transition-shadow">\n      <div className="flex items-center justify-between mb-2">\n        <h3 className="font-semibold text-sm">{result.title}</h3>\n        <span className={\`px-2 py-1 rounded-full text-xs font-medium \${statusColors[result.status]}\`}>\n          {result.status}\n        </span>\n      </div>\n      <div className="flex items-center gap-2">\n        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">\n          <div\n            className="h-full bg-gradient-to-r from-violet-500 to-orange-500 rounded-full"\n            style={{ width: \`\${result.score}%\` }}\n          />\n        </div>\n        <span className="text-xs text-muted-foreground">{result.score}%</span>\n      </div>\n    </div>\n  );\n}\n\nexport default TaskResultCard;`,
        summary: `React component implementation with TypeScript and Tailwind CSS for ${topic}`,
        files: ['TaskResultCard.tsx'],
      });

    default:
      return JSON.stringify({
        deliverable: `Completed work for: ${subtaskDescription}`,
        summary: 'Task completed successfully',
      });
  }
}

export async function simulateEvaluation(
  subtaskDescription: string,
  deliverable: string
): Promise<string> {
  await delay(600 + Math.random() * 400);

  const hasContent = deliverable.length > 0;
  const score = hasContent ? 72 + Math.floor(Math.random() * 23) : 40; // 72-94 if content exists
  return JSON.stringify({
    passed: true,
    score,
    reasoning: `The deliverable addresses the requirements of "${subtaskDescription.substring(0, 50)}..." with good quality. Content is well-structured, relevant, and professionally presented. Score: ${score}/100.`,
    suggestions: ['Could add more specific examples', 'Consider edge cases'],
  });
}

export async function simulateCompilation(
  taskDescription: string,
  results: Array<{ type: string; description: string; deliverable: string }>
): Promise<string> {
  await delay(800 + Math.random() * 400);

  const agentContributions = results.map(
    (r, i) => `Agent ${i + 1} (${r.type}): ${r.description.substring(0, 60)}`
  );

  const combinedDeliverables = results
    .map((r) => `## ${r.type.charAt(0).toUpperCase() + r.type.slice(1)} Output\n\n${r.deliverable}`)
    .join('\n\n---\n\n');

  return JSON.stringify({
    finalResult: `# Final Deliverable: ${taskDescription}\n\n${combinedDeliverables}\n\n---\n\n## Summary\nThis deliverable was compiled from ${results.length} specialist agents working autonomously. Each agent was hired, escrowed, evaluated, and paid on-chain via Forba's marketplace protocol.`,
    summary: `Compiled ${results.length} agent outputs into cohesive deliverable`,
    agentContributions,
  });
}

export function isSimulationMode(): boolean {
  return !process.env.OPENAI_API_KEY && !process.env.LOCUS_API_KEY;
}
