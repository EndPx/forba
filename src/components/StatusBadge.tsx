'use client';

const STATUS_CONFIG: Record<string, {
  dot: string;
  text: string;
  pulse: boolean;
}> = {
  pending:     { dot: 'bg-zinc-300',   text: 'text-zinc-500',   pulse: false },
  created:     { dot: 'bg-zinc-300',   text: 'text-zinc-500',   pulse: false },
  decomposing: { dot: 'bg-blue-400',   text: 'text-blue-600',   pulse: true  },
  assigned:    { dot: 'bg-blue-400',   text: 'text-blue-600',   pulse: true  },
  in_progress: { dot: 'bg-amber-400',  text: 'text-amber-600',  pulse: true  },
  working:     { dot: 'bg-amber-400',  text: 'text-amber-600',  pulse: true  },
  funded:      { dot: 'bg-amber-400',  text: 'text-amber-600',  pulse: false },
  delivered:   { dot: 'bg-zinc-400',   text: 'text-zinc-600',   pulse: false },
  approved:    { dot: 'bg-green-500',  text: 'text-green-700',  pulse: false },
  completed:   { dot: 'bg-green-500',  text: 'text-green-700',  pulse: false },
  released:    { dot: 'bg-green-500',  text: 'text-green-700',  pulse: false },
  rejected:    { dot: 'bg-red-400',    text: 'text-red-600',    pulse: false },
  failed:      { dot: 'bg-red-400',    text: 'text-red-600',    pulse: false },
  refunded:    { dot: 'bg-red-400',    text: 'text-red-600',    pulse: false },
  idle:        { dot: 'bg-green-500',  text: 'text-green-700',  pulse: false },
  offline:     { dot: 'bg-zinc-300',   text: 'text-zinc-500',   pulse: false },
};

const FALLBACK = STATUS_CONFIG.pending;

export function StatusBadge({ status }: { status: string }) {
  const conf = STATUS_CONFIG[status] || FALLBACK;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${conf.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${conf.dot} ${conf.pulse ? 'animate-pulse' : ''}`} />
      {status.replace(/_/g, ' ')}
    </span>
  );
}
