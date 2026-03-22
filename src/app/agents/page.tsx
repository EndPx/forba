'use client';

import { useEffect, useState } from 'react';
import { AgentCard } from '@/components/AgentCard';
import { Search, Loader2 } from 'lucide-react';

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
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/agents');
        const data = await res.json();
        setAgents(data);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
    const interval = setInterval(fetchAgents, 10000);
    return () => clearInterval(interval);
  }, []);

  const types = ['all', ...Array.from(new Set(agents.map((a) => a.type)))];

  const filtered = agents.filter((a) => {
    const matchType = filter === 'all' || a.type === filter;
    const matchSearch =
      search.trim() === '' ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase()) ||
      a.capabilities.some((c) => c.toLowerCase().includes(search.toLowerCase()));
    return matchType && matchSearch;
  });

  const countByType = types.reduce<Record<string, number>>((acc, t) => {
    acc[t] = t === 'all' ? agents.length : agents.filter((a) => a.type === t).length;
    return acc;
  }, {});

  const availableCount = agents.filter((a) => a.status === 'idle').length;
  const busyCount      = agents.filter((a) => a.status === 'working').length;
  const totalEarnings  = agents.reduce((s, a) => s + a.totalEarnings, 0);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-6xl">

      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Agent Marketplace</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Specialist AI agents available for autonomous hire</p>
      </div>

      {/* Summary stats */}
      {agents.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-zinc-200 rounded-lg bg-white p-3">
            <p className="text-xl font-semibold text-zinc-900 tabular-nums">{availableCount}</p>
            <p className="text-xs text-zinc-400 mt-0.5">Available</p>
          </div>
          <div className="border border-zinc-200 rounded-lg bg-white p-3">
            <p className="text-xl font-semibold text-zinc-900 tabular-nums">{busyCount}</p>
            <p className="text-xs text-zinc-400 mt-0.5">Busy</p>
          </div>
          <div className="border border-zinc-200 rounded-lg bg-white p-3">
            <p className="text-xl font-semibold text-zinc-900 tabular-nums font-mono">${totalEarnings.toFixed(0)}</p>
            <p className="text-xs text-zinc-400 mt-0.5">Total Earned</p>
          </div>
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-300 pointer-events-none" />
          <input
            type="text"
            placeholder="Search agents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-md border border-zinc-200 bg-white text-sm placeholder:text-zinc-300 focus:outline-none focus:border-zinc-300 focus:ring-1 focus:ring-zinc-200 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                filter === type
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:text-zinc-700'
              }`}
            >
              {type === 'all' ? 'All' : type}
              <span className={`ml-1.5 font-mono ${filter === type ? 'text-zinc-300' : 'text-zinc-400'}`}>
                {countByType[type] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading agents…
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-2 text-center">
          <p className="text-sm text-zinc-500">No agents found</p>
          <p className="text-xs text-zinc-400">
            {search ? `No results for "${search}"` : 'The marketplace is loading…'}
          </p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-xs text-zinc-500 underline underline-offset-2 mt-1 hover:text-zinc-800"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-zinc-400">
            {filtered.length} agent{filtered.length !== 1 ? 's' : ''}
            {filter !== 'all' && <span> · {filter}</span>}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
