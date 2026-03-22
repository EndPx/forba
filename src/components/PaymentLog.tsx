'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';

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

const STATUS_TEXT: Record<string, { text: string; dot: string }> = {
  funded:   { text: 'text-amber-600',  dot: 'bg-amber-400' },
  released: { text: 'text-green-600',  dot: 'bg-green-500' },
  refunded: { text: 'text-red-500',    dot: 'bg-red-400'   },
  created:  { text: 'text-zinc-500',   dot: 'bg-zinc-300'  },
  pending:  { text: 'text-zinc-500',   dot: 'bg-zinc-300'  },
};

function formatUSDC(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
  const activeTxHash = (e: EscrowData) => e.releaseTxHash || e.refundTxHash || e.fundTxHash;

  return (
    <Card className="border-zinc-200 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-zinc-900">Escrow Log</CardTitle>
          {escrows.length > 0 && (
            <span className="text-xs font-mono text-zinc-500">
              {formatUSDC(totalReleased)} released
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {escrows.length === 0 ? (
          <div className="py-10 flex items-center justify-center">
            <p className="text-xs text-zinc-400">No escrow activity yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2 border-b border-zinc-100 text-xs text-zinc-400 font-medium">
              <span>Subtask</span>
              <span className="text-right">Amount</span>
              <span className="text-center">Status</span>
              <span className="text-right">Tx</span>
            </div>

            <div className="divide-y divide-zinc-50">
              {escrows.map((escrow) => {
                const conf = STATUS_TEXT[escrow.status] || STATUS_TEXT.pending;
                const txHash = activeTxHash(escrow);

                return (
                  <div
                    key={escrow.id}
                    className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-4 py-2.5 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-zinc-700 truncate">
                        {escrow.subtaskId.substring(0, 8)}…
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                        {formatTime(escrow.createdAt)}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-mono text-zinc-900">
                        {formatUSDC(escrow.amount)}
                      </span>
                      <p className="text-xs text-zinc-400">USDC</p>
                    </div>

                    <div className="flex justify-center">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${conf.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
                        {escrow.status}
                      </span>
                    </div>

                    <div className="flex justify-end">
                      {txHash ? (
                        <a
                          href={`https://sepolia.basescan.org/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-mono text-zinc-500 hover:text-zinc-800 transition-colors"
                        >
                          {shortHash(txHash)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-300">—</span>
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
