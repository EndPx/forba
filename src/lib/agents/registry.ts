import { v4 as uuidv4 } from 'uuid';
import { Agent, AgentSeed, AgentType } from '../types';
import { registerAgent as locusRegister } from '../payments/locus';
import { store } from '../store';
// import { emitter } from '../events/emitter';

// Default agent seeds - 2 per type for genuine discovery
const DEFAULT_AGENTS: AgentSeed[] = [
  {
    name: 'CodeSmith',
    type: 'code',
    description: 'Full-stack developer specializing in React, TypeScript, and modern web applications',
    capabilities: ['typescript', 'react', 'nextjs', 'html', 'css', 'tailwind'],
    pricing: 0.05,
    preferredToken: 'USDC',
  },
  {
    name: 'ByteForge',
    type: 'code',
    description: 'Backend and smart contract developer with focus on clean architecture',
    capabilities: ['typescript', 'nodejs', 'solidity', 'api-design', 'databases'],
    pricing: 0.08,
    preferredToken: 'USDC',
  },
  {
    name: 'InsightBot',
    type: 'research',
    description: 'Research analyst specializing in market analysis, competitor research, and trend reports',
    capabilities: ['market-research', 'competitor-analysis', 'trend-analysis', 'data-synthesis'],
    pricing: 0.04,
    preferredToken: 'USDC',
  },
  {
    name: 'DeepDive',
    type: 'research',
    description: 'Technical researcher focused on technology evaluation and documentation',
    capabilities: ['tech-research', 'documentation', 'comparison-analysis', 'best-practices'],
    pricing: 0.06,
    preferredToken: 'WETH',
  },
  {
    name: 'WordCraft',
    type: 'copy',
    description: 'Creative copywriter specializing in marketing content, taglines, and brand messaging',
    capabilities: ['marketing-copy', 'taglines', 'brand-voice', 'social-media', 'landing-pages'],
    pricing: 0.03,
    preferredToken: 'USDC',
  },
  {
    name: 'NarrativeAI',
    type: 'copy',
    description: 'Content strategist and long-form writer for blogs, articles, and documentation',
    capabilities: ['blog-posts', 'articles', 'content-strategy', 'seo-writing', 'storytelling'],
    pricing: 0.05,
    preferredToken: 'USDC',
  },
];

let initialized = false;

export async function seedAgents(): Promise<Agent[]> {
  if (initialized && store.getAllAgents().length > 0) {
    console.log('Agents already seeded, skipping...');
    return store.getAllAgents();
  }

  console.log('Seeding agents...');
  const agents: Agent[] = [];

  for (const seed of DEFAULT_AGENTS) {
    try {
      // Register with Locus to get a wallet
      let locusData = { apiKey: '', walletId: '', ownerAddress: '' };
      try {
        locusData = await locusRegister(seed.name);
      } catch (error) {
        console.warn(`Locus registration failed for ${seed.name}, using mock data:`, error);
        locusData = {
          apiKey: `mock-key-${seed.name.toLowerCase()}`,
          walletId: `mock-wallet-${uuidv4().slice(0, 8)}`,
          ownerAddress: `0x${uuidv4().replace(/-/g, '').slice(0, 40)}`,
        };
      }

      const agent: Agent = {
        id: uuidv4(),
        name: seed.name,
        type: seed.type,
        description: seed.description,
        capabilities: seed.capabilities,
        pricing: seed.pricing,
        locusApiKey: locusData.apiKey,
        locusWalletId: locusData.walletId,
        locusOwnerAddress: locusData.ownerAddress,
        preferredToken: seed.preferredToken || 'USDC',
        status: 'idle',
        totalEarnings: 0,
        tasksCompleted: 0,
        createdAt: new Date().toISOString(),
      };

      store.registerAgent(agent);
      agents.push(agent);
      console.log(`Registered agent: ${agent.name} (${agent.type})`);
    } catch (error) {
      console.error(`Failed to seed agent ${seed.name}:`, error);
    }
  }

  initialized = true;
  return agents;
}

export function discoverAgents(type: AgentType): Agent[] {
  return store.getAgentsByType(type);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function selectBestAgent(agents: Agent[], subtaskDescription: string): Agent | null {
  if (agents.length === 0) return null;

  // Simple selection: prefer cheaper agents for simple tasks, more capable for complex
  // Sort by: fewer completed tasks first (load balancing), then by pricing
  const sorted = [...agents].sort((a, b) => {
    // Prefer idle agents
    if (a.status === 'idle' && b.status !== 'idle') return -1;
    if (b.status === 'idle' && a.status !== 'idle') return 1;
    // Then by task count (load balance)
    if (a.tasksCompleted !== b.tasksCompleted) return a.tasksCompleted - b.tasksCompleted;
    // Then by price (cheaper first)
    return a.pricing - b.pricing;
  });

  return sorted[0];
}

export function getAgentPublicInfo(agent: Agent) {
  return {
    id: agent.id,
    name: agent.name,
    type: agent.type,
    description: agent.description,
    capabilities: agent.capabilities,
    pricing: agent.pricing,
    preferredToken: agent.preferredToken,
    status: agent.status,
    totalEarnings: agent.totalEarnings,
    tasksCompleted: agent.tasksCompleted,
  };
}
