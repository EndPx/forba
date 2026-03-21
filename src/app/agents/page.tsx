'use client';

import { useEffect, useState } from 'react';
import { AgentCard } from '@/components/AgentCard';
import { Users, Search, Code, BookOpen, PenTool, Cpu, Loader2 } from 'lucide-react';

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

const TYPE_META: Record<string, { label: string; icon: typeof Code; color: string; bg: string; border: string }> = {
  all:         { label: 'All',         icon: Users,    color: 'text-slate-600',   bg: 'bg-slate-50',   border: 'border-slate-200' },
  code:        { label: 'Code',        icon: Code,     color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200' },
  research:    { label: 'Research',    icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  copy:        { label: 'Copy',        icon: PenTool,  color: 'text-pink-600',    bg: 'bg-pink-50',    border: 'border-pink-200' },
  orchestrator:{ label: 'Orchestrator',icon: Cpu,      color: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-200' },
};

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

  // Counts by type
  const countByType = types.reduce<Record<string, number>>((acc, t) => {
    acc[t] = t === 'all' ? agents.length : agents.filter((a) => a.type === t).length;
    return acc;
  }, {});

  // Summary stats
  const availableCount = agents.filter((a) => a.status === 'idle').length;
  const busyCount      = agents.filter((a) => a.status === 'working').length;
  const totalEarnings  = agents.reduce((s, a) => s + a.totalEarnings, 0);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-orange-500 flex items-center justify-center shadow-sm">
          <Users className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Agent Marketplace</h1>
          <p className="text-xs text-muted-foreground">Specialist AI agents available for autonomous hire</p>
        </div>
      </div>

      {/* Summary stats */}
      {agents.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <div>
              <p className="text-lg font-bold text-green-700 tabular-nums">{availableCount}</p>
              <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wide">Available</p>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <div>
              <p className="text-lg font-bold text-amber-700 tabular-nums">{busyCount}</p>
              <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide">Busy</p>
            </div>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-violet-500" />
            <div>
              <p className="text-lg font-bold text-violet-700 tabular-nums">${totalEarnings.toFixed(0)}</p>
              <p className="text-[10px] text-violet-600 font-semibold uppercase tracking-wide">Total Earned</p>
            </div>
          </div>
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search agents by name, skill, or capability…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all"
          />
        </div>

        {/* Type filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {types.map((type) => {
            const meta = TYPE_META[type] || TYPE_META.all;
            const Icon = meta.icon;
            const isActive = filter === type;
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 ${
                  isActive
                    ? `${meta.bg} ${meta.color} ${meta.border} shadow-sm`
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-3 w-3" />
                {meta.label}
                <span className={`font-mono text-[10px] px-1 py-0.5 rounded-md ${
                  isActive ? 'bg-white/60' : 'bg-slate-100'
                }`}>
                  {countByType[type] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="py-20 flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Loading agents…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-100 to-orange-50 flex items-center justify-center">
            <Users className="h-7 w-7 text-violet-300" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">No agents found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {search ? `No results for "${search}"` : 'The marketplace is loading…'}
            </p>
          </div>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-xs text-violet-600 hover:text-violet-800 underline underline-offset-2"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filtered.length}</span> agent{filtered.length !== 1 ? 's' : ''}
              {filter !== 'all' && (
                <span> in <span className="font-semibold text-foreground capitalize">{filter}</span></span>
              )}
            </p>
          </div>

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
