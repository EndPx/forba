'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Code, Search, PenTool, Cpu, TrendingUp, CheckSquare } from 'lucide-react';

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

const TYPE_CONFIG: Record<string, {
  icon: typeof Code;
  gradient: string;
  skillBg: string;
  skillText: string;
  skillBorder: string;
  accentText: string;
}> = {
  code: {
    icon: Code,
    gradient: 'from-blue-500 to-cyan-400',
    skillBg: 'bg-blue-50', skillText: 'text-blue-700', skillBorder: 'border-blue-200',
    accentText: 'text-blue-600',
  },
  research: {
    icon: Search,
    gradient: 'from-emerald-500 to-green-400',
    skillBg: 'bg-emerald-50', skillText: 'text-emerald-700', skillBorder: 'border-emerald-200',
    accentText: 'text-emerald-600',
  },
  copy: {
    icon: PenTool,
    gradient: 'from-pink-500 to-rose-400',
    skillBg: 'bg-pink-50', skillText: 'text-pink-700', skillBorder: 'border-pink-200',
    accentText: 'text-pink-600',
  },
  orchestrator: {
    icon: Cpu,
    gradient: 'from-violet-500 to-orange-400',
    skillBg: 'bg-violet-50', skillText: 'text-violet-700', skillBorder: 'border-violet-200',
    accentText: 'text-violet-600',
  },
};

const STATUS_CONFIG: Record<string, { dot: string; label: string; bg: string; text: string; border: string }> = {
  idle:    { dot: 'bg-green-400 animate-pulse', label: 'Available', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  working: { dot: 'bg-amber-400 animate-pulse', label: 'Busy',      bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  offline: { dot: 'bg-slate-300',               label: 'Offline',   bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200' },
};

export function AgentCard({ agent }: { agent: AgentData }) {
  const config = TYPE_CONFIG[agent.type] || TYPE_CONFIG.code;
  const statusConf = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle;
  const Icon = config.icon;

  return (
    <Card className="group overflow-hidden border-slate-200/80 hover:border-violet-200 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(139,92,246,0.12)] hover:-translate-y-0.5 cursor-default">
      {/* Top gradient bar */}
      <div className={`h-1 bg-gradient-to-r ${config.gradient}`} />

      <CardContent className="pt-4 pb-4 px-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-300`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            {/* Status dot on avatar */}
            <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${statusConf.dot}`} />
          </div>

          {/* Name + description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm text-foreground leading-snug">{agent.name}</h3>
              <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusConf.bg} ${statusConf.text} ${statusConf.border}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusConf.dot}`} />
                {statusConf.label}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{agent.description}</p>
          </div>
        </div>

        {/* Skill pills */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {agent.capabilities.slice(0, 4).map((cap) => (
            <span
              key={cap}
              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${config.skillBg} ${config.skillText} ${config.skillBorder}`}
            >
              {cap}
            </span>
          ))}
          {agent.capabilities.length > 4 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full border bg-slate-50 text-slate-500 border-slate-200 font-medium">
              +{agent.capabilities.length - 4} more
            </span>
          )}
        </div>

        {/* Footer stats */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          {/* Pricing */}
          <div className="flex items-center gap-1">
            <span className={`text-xs font-mono font-semibold ${config.accentText}`}>
              ${agent.pricing.toFixed(2)}
            </span>
            <span className="text-[10px] text-muted-foreground">USDC/task</span>
          </div>

          {/* Earnings & tasks */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <CheckSquare className="h-3 w-3" />
              <span className="font-mono">{agent.tasksCompleted}</span>
              <span>tasks</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="font-mono font-medium text-green-600">${agent.totalEarnings.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
