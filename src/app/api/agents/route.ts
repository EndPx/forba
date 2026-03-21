import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { seedAgents, getAgentPublicInfo } from '@/lib/agents/registry';

export async function GET() {
  try {
    // Ensure agents are seeded
    await seedAgents();

    const agents = store.getAllAgents();
    return NextResponse.json(agents.map(getAgentPublicInfo));
  } catch (error) {
    console.error('GET /api/agents error:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}
