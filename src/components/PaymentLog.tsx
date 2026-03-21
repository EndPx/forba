'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, ExternalLink, TrendingUp, Clock, RotateCcw, DollarSign } from 'lucide-react';

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

const STATUS_CHIP: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  funded:   { label: 'Funded',   bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-400' },
  released: { label: 'Released', bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-400' },
  refunded: { label: 'Refunded', bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-400' },
  created:  { label: 'Created',  bg: 'bg-slate-50',  text: 'text-slate-600',  border: 'border-slate-200',  dot: 'bg-slate-300' },
  pending:  { label: 'Pending',  bg: 'bg-slate-50',  text: 'text-slate-600',  border: 'border-slate-200',  dot: 'bg-slate-300' },
};

function formatUSDC(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function shortHash(hash: string): string {
  return `${hash.substring(0, 6)}…${hash.substring(hash.length - 4)}`;
}

export function PaymentLog() {
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

  const activeTxHash = (e: EscrowData) => e.releaseTxHash || e.refundTxHash || e.fundTxHash;

  return (
    <Card className="border-violet-100 overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-violet-50/60 to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-orange-500 flex items-center justify-center shadow-sm">
              <CreditCard className="h-3.5 w-3.5 text-white" />
            </div>
            Payment Audit Trail
          </CardTitle>
          <span className="text-xs font-mono font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
            {formatUSDC(totalReleased)} paid
          </span>
        </div>

        {/* Summary stats */}
        {escrows.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-lg px-2.5 py-1.5">
              <TrendingUp className="h-3 w-3 text-green-500 shrink-0" />
              <div>
                <p className="text-[9px] text-green-600 font-medium uppercase tracking-wide">Released</p>
                <p className="text-xs font-mono font-semibold text-green-700">{formatUSDC(totalReleased)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
              <Clock className="h-3 w-3 text-amber-500 shrink-0" />
              <div>
                <p className="text-[9px] text-amber-600 font-medium uppercase tracking-wide">Pending</p>
                <p className="text-xs font-mono font-semibold text-amber-700">{formatUSDC(totalPending)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
              <RotateCcw className="h-3 w-3 text-red-400 shrink-0" />
              <div>
                <p className="text-[9px] text-red-500 font-medium uppercase tracking-wide">Refunded</p>
                <p className="text-xs font-mono font-semibold text-red-600">{formatUSDC(totalRefunded)}</p>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {escrows.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-100 to-orange-50 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-violet-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">No payments yet</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Escrow activity will appear here as agents complete work</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2 bg-slate-50/80 border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Escrow</span>
              <span className="text-right">Amount</span>
              <span className="text-center">Status</span>
              <span className="text-right">Tx</span>
            </div>

            <div className="divide-y divide-slate-50">
              {escrows.map((escrow) => {
                const chip = STATUS_CHIP[escrow.status] || STATUS_CHIP.pending;
                const txHash = activeTxHash(escrow);

                return (
                  <div
                    key={escrow.id}
                    className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-4 py-3 hover:bg-violet-50/30 transition-colors"
                  >
                    {/* Escrow info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${chip.dot}`} />
                        <p className="text-xs font-mono text-foreground truncate">
                          {escrow.subtaskId.substring(0, 8)}…
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                        {formatDate(escrow.createdAt)}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <span className="text-sm font-mono font-semibold text-foreground">
                        {formatUSDC(escrow.amount)}
                      </span>
                      <p className="text-[9px] text-muted-foreground">USDC</p>
                    </div>

                    {/* Status chip */}
                    <div className="flex justify-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${chip.bg} ${chip.text} ${chip.border}`}>
                        <span className={`h-1 w-1 rounded-full ${chip.dot}`} />
                        {chip.label}
                      </span>
                    </div>

                    {/* Tx link */}
                    <div className="flex justify-end">
                      {txHash ? (
                        <a
                          href={`https://sepolia.basescan.org/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] font-mono text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-2 py-1 rounded-lg transition-all"
                        >
                          {shortHash(txHash)}
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
