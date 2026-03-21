'use client';

import { useEffect, useState } from 'react';
import { PaymentLog } from '@/components/PaymentLog';
import { CreditCard, TrendingUp, Clock, RotateCcw, Shield, ExternalLink } from 'lucide-react';

interface EscrowData {
  id: string;
  taskId: string;
  subtaskId: string;
  clientAgentId: string;
  providerAgentId: string;
  amount: number;
  status: string;
  fundTxHash?: string;
  releaseTxHash?: string;
  refundTxHash?: string;
  createdAt: string;
  releasedAt?: string;
}

export default function PaymentsPage() {
  const [escrows, setEscrows] = useState<EscrowData[]>([]);

  useEffect(() => {
    const fetchEscrows = async () => {
      try {
        const res = await fetch('/api/payments');
        const data = await res.json();
        setEscrows(data);
      } catch (error) {
        console.error('Failed to fetch payments:', error);
      }
    };
    fetchEscrows();
    const interval = setInterval(fetchEscrows, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalReleased = escrows.filter((e) => e.status === 'released').reduce((s, e) => s + e.amount, 0);
  const totalPending  = escrows.filter((e) => e.status === 'funded').reduce((s, e) => s + e.amount, 0);
  const totalRefunded = escrows.filter((e) => e.status === 'refunded').reduce((s, e) => s + e.amount, 0);
  const totalVolume   = escrows.reduce((s, e) => s + e.amount, 0);

  const STATS = [
    {
      label: 'Total Released',
      value: `$${totalReleased.toFixed(2)}`,
      sub: `${escrows.filter((e) => e.status === 'released').length} payments`,
      icon: TrendingUp,
      gradient: 'from-green-500 to-emerald-400',
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-100',
    },
    {
      label: 'Pending Escrow',
      value: `$${totalPending.toFixed(2)}`,
      sub: `${escrows.filter((e) => e.status === 'funded').length} active`,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-400',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-100',
    },
    {
      label: 'Refunded',
      value: `$${totalRefunded.toFixed(2)}`,
      sub: `${escrows.filter((e) => e.status === 'refunded').length} refunds`,
      icon: RotateCcw,
      gradient: 'from-red-400 to-rose-400',
      bg: 'bg-red-50',
      text: 'text-red-600',
      border: 'border-red-100',
    },
    {
      label: 'Total Volume',
      value: `$${totalVolume.toFixed(2)}`,
      sub: `${escrows.length} escrows`,
      icon: Shield,
      gradient: 'from-violet-500 to-orange-400',
      bg: 'bg-violet-50',
      text: 'text-violet-700',
      border: 'border-violet-100',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-orange-500 flex items-center justify-center shadow-sm">
            <CreditCard className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Payment Audit Trail</h1>
            <p className="text-xs text-muted-foreground">On-chain escrow activity via ForbaEscrow on Base Sepolia</p>
          </div>
        </div>

        {/* Contract link */}
        <a
          href="https://sepolia.basescan.org"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 bg-violet-50 border border-violet-200 px-3 py-1.5 rounded-lg transition-colors hover:bg-violet-100"
        >
          <Shield className="h-3 w-3" />
          ForbaEscrow
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`rounded-2xl border ${stat.border} ${stat.bg} p-4 flex items-center gap-3`}
            >
              <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-sm shrink-0`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className={`text-xl font-bold font-mono tabular-nums ${stat.text}`}>{stat.value}</p>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide leading-none mt-0.5">{stat.label}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{stat.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contract info banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-blue-100 bg-blue-50/60">
        <Shield className="h-4 w-4 text-blue-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-blue-700">Trustless Escrow on Base Sepolia</p>
          <p className="text-[11px] text-blue-600/70 mt-0.5">
            Every payment flows through a verified smart contract. Agents are paid only after work is evaluated and approved.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-[10px] font-semibold text-blue-600">Base Sepolia</span>
        </div>
      </div>

      {/* Payment log table */}
      <PaymentLog />
    </div>
  );
}
