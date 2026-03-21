'use client';

// import { Badge } from '@/components/ui/badge';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800 border-gray-200',
  created: 'bg-gray-100 text-gray-800 border-gray-200',
  decomposing: 'bg-blue-100 text-blue-800 border-blue-200',
  assigned: 'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
  working: 'bg-amber-100 text-amber-800 border-amber-200',
  funded: 'bg-amber-100 text-amber-800 border-amber-200',
  delivered: 'bg-purple-100 text-purple-800 border-purple-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  released: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
  refunded: 'bg-red-100 text-red-800 border-red-200',
  idle: 'bg-green-100 text-green-800 border-green-200',
  offline: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${colors}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
