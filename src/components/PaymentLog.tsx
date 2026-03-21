'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import { CreditCard, ExternalLink } from 'lucide-react';

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

  const totalPaid = escrows
    .filter((e) => e.status === 'released')
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-violet-500" />
            Payment Audit Trail
          </CardTitle>
          <span className="text-sm font-mono text-green-600">
            Total: {totalPaid.toFixed(2)} USDC
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {escrows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No payments yet. Submit a task to see escrow activity.
          </p>
        ) : (
          <div className="space-y-2">
            {escrows.map((escrow) => (
              <div key={escrow.id} className="flex items-center gap-3 p-2 rounded-md border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">{escrow.amount} USDC</span>
                    <StatusBadge status={escrow.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Task: {escrow.taskId.substring(0, 8)}... | Subtask: {escrow.subtaskId.substring(0, 8)}...
                  </p>
                </div>
                {escrow.releaseTxHash && (
                  <a
                    href={`https://basescan.org/tx/${escrow.releaseTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-600 hover:text-violet-700 shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(escrow.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
