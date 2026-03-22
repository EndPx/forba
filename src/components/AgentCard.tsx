'use client';

import { Card, CardContent } from '@/components/ui/card';

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

const STATUS_CONFIG: Record<string, { dot: string; label: string; text: string }> = {
  idle:    { dot: 'bg-green-500', label: 'Available', text: 'text-green-700' },
  working: { dot: 'bg-amber-400', label: 'Busy',      text: 'text-amber-700' },
  offline: { dot: 'bg-zinc-300',  label: 'Offline',   text: 'text-zinc-500'  },
};

export function AgentCard({ agent }: { agent: AgentData }) {
  const statusConf = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle;

  return (
    <Card className="border-zinc-200 hover:border-zinc-300 transition-colors duration-150 cursor-default">
      <CardContent className="pt-4 pb-4 px-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm text-zinc-900 truncate">{agent.name}</h3>
            <p className="text-xs text-zinc-400 capitalize mt-0.5">{agent.type}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs shrink-0 ${statusConf.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusConf.dot}`} />
            {statusConf.label}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-zinc-500 mt-2.5 leading-relaxed line-clamp-2">{agent.description}</p>

        {/* Capabilities */}
        <div className="flex flex-wrap gap-1 mt-3">
          {agent.capabilities.slice(0, 4).map((cap) => (
            <span
              key={cap}
              className="text-xs px-2 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-zinc-600"
            >
              {cap}
            </span>
          ))}
          {agent.capabilities.length > 4 && (
            <span className="text-xs px-2 py-0.5 rounded border border-zinc-200 bg-zinc-50 text-zinc-400">
              +{agent.capabilities.length - 4}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100">
          <span className="text-xs font-mono text-zinc-700">
            ${agent.pricing.toFixed(2)} <span className="text-zinc-400 font-sans">/ task</span>
          </span>
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="font-mono">{agent.tasksCompleted} tasks</span>
            <span className="font-mono text-zinc-600">${agent.totalEarnings.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
