'use client';

const STATUS_CONFIG: Record<string, {
  bg: string;
  text: string;
  border: string;
  dot: string;
  pulse: boolean;
}> = {
  pending:     { bg: 'bg-slate-50',   text: 'text-slate-500',   border: 'border-slate-200',  dot: 'bg-slate-300',   pulse: false },
  created:     { bg: 'bg-slate-50',   text: 'text-slate-500',   border: 'border-slate-200',  dot: 'bg-slate-300',   pulse: false },
  decomposing: { bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-200',   dot: 'bg-blue-400',    pulse: true  },
  assigned:    { bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-200',   dot: 'bg-blue-400',    pulse: true  },
  in_progress: { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  dot: 'bg-amber-400',   pulse: true  },
  working:     { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  dot: 'bg-amber-400',   pulse: true  },
  funded:      { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  dot: 'bg-amber-400',   pulse: false },
  delivered:   { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200', dot: 'bg-purple-400',  pulse: false },
  approved:    { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',  dot: 'bg-green-400',   pulse: false },
  completed:   { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',  dot: 'bg-green-400',   pulse: false },
  released:    { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',  dot: 'bg-green-400',   pulse: false },
  rejected:    { bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-200',    dot: 'bg-red-400',     pulse: false },
  failed:      { bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-200',    dot: 'bg-red-400',     pulse: false },
  refunded:    { bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-200',    dot: 'bg-red-400',     pulse: false },
  idle:        { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',  dot: 'bg-green-400',   pulse: true  },
  offline:     { bg: 'bg-slate-50',   text: 'text-slate-500',   border: 'border-slate-200',  dot: 'bg-slate-300',   pulse: false },
};

const FALLBACK = STATUS_CONFIG.pending;

export function StatusBadge({ status }: { status: string }) {
  const conf = STATUS_CONFIG[status] || FALLBACK;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold border whitespace-nowrap
        ${conf.bg} ${conf.text} ${conf.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${conf.dot} ${conf.pulse ? 'animate-pulse' : ''}`} />
      {status.replace(/_/g, ' ')}
    </span>
  );
}
