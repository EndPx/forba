'use client';

import { useEffect, useState } from 'react';
import { AgentCard } from '@/components/AgentCard';
import { Users } from 'lucide-react';

interface AgentData {
  id: string;
  name: string;
  type: string;
  description: string;
  capabilities: string[];
  pricing: number;
  preferredToken: string;
  status: string;
  totalEarnings: number;
  tasksCompleted: number;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/agents');
        const data = await res.json();
        setAgents(data);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      }
    };
    fetchAgents();
    const interval = setInterval(fetchAgents, 10000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === 'all' ? agents : agents.filter((a) => a.type === filter);
  const types = ['all', ...Array.from(new Set(agents.map((a) => a.type)))];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-violet-500" />
          <h1 className="text-xl font-bold">Agent Marketplace</h1>
          <span className="text-sm text-muted-foreground">({agents.length} agents)</span>
        </div>
        <div className="flex gap-1">
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === type
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No agents found. The marketplace is loading...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
