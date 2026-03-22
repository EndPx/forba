'use client';

import { useEffect, useState } from 'react';
import { PaymentLog } from '@/components/PaymentLog';
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

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-5xl">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Payments</h1>
          <p className="text-sm text-zinc-400 mt-0.5">On-chain escrow activity via ForbaEscrow on Base Sepolia</p>
        </div>
        <a
          href="https://sepolia.basescan.org/address/0x2b1Ba5E95830AbafBc828B9d2581cB17C10f0dE9"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
        >
          <span className="font-mono">0x2b1Ba5…0dE9</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Released',     value: `$${totalReleased.toFixed(2)}`,  sub: `${escrows.filter((e) => e.status === 'released').length} payments` },
          { label: 'In Escrow',    value: `$${totalPending.toFixed(2)}`,   sub: `${escrows.filter((e) => e.status === 'funded').length} active` },
          { label: 'Refunded',     value: `$${totalRefunded.toFixed(2)}`,  sub: `${escrows.filter((e) => e.status === 'refunded').length} refunds` },
          { label: 'Total Volume', value: `$${totalVolume.toFixed(2)}`,    sub: `${escrows.length} escrows` },
        ].map((stat) => (
          <div key={stat.label} className="border border-zinc-200 rounded-lg bg-white p-4">
            <p className="text-xl font-semibold text-zinc-900 tabular-nums font-mono">{stat.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{stat.label}</p>
            <p className="text-xs text-zinc-300 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Contract info */}
      <div className="border border-zinc-200 rounded-lg bg-white p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-zinc-400 mb-1">Contract</p>
              <a
                href="https://sepolia.basescan.org/address/0x2b1Ba5E95830AbafBc828B9d2581cB17C10f0dE9"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-zinc-700 hover:text-zinc-900 flex items-center gap-1 transition-colors"
              >
                0x2b1Ba5…0dE9
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div>
              <p className="text-zinc-400 mb-1">Network</p>
              <div className="flex items-center gap-1.5 text-zinc-700">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
                Base Sepolia
              </div>
            </div>
            <div>
              <p className="text-zinc-400 mb-1">Status</p>
              <div className="flex items-center gap-1.5 text-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                Verified
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment log */}
      <PaymentLog />
    </div>
  );
}
