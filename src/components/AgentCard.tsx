'use client';

import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import { Code, Search, PenTool, Cpu, DollarSign } from 'lucide-react';

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

const TYPE_CONFIG: Record<string, { icon: typeof Code; gradient: string }> = {
  code: { icon: Code, gradient: 'from-blue-500 to-cyan-500' },
  research: { icon: Search, gradient: 'from-green-500 to-emerald-500' },
  copy: { icon: PenTool, gradient: 'from-purple-500 to-pink-500' },
  orchestrator: { icon: Cpu, gradient: 'from-violet-500 to-orange-500' },
};

export function AgentCard({ agent }: { agent: AgentData }) {
  const config = TYPE_CONFIG[agent.type] || TYPE_CONFIG.code;
  const Icon = config.icon;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className={`h-1.5 bg-gradient-to-r ${config.gradient}`} />
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center shrink-0`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{agent.name}</h3>
              <StatusBadge status={agent.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{agent.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-3">
          {agent.capabilities.slice(0, 4).map((cap) => (
            <span key={cap} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {cap}
            </span>
          ))}
          {agent.capabilities.length > 4 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              +{agent.capabilities.length - 4}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-mono">{agent.pricing} USDC/task</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {agent.tasksCompleted} tasks | {agent.totalEarnings.toFixed(2)} USDC earned
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
