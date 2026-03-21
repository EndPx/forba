'use client';

import { PaymentLog } from '@/components/PaymentLog';
import { CreditCard } from 'lucide-react';

export default function PaymentsPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <CreditCard className="h-5 w-5 text-violet-500" />
        <h1 className="text-xl font-bold">Payment Audit Trail</h1>
      </div>
      <PaymentLog />
    </div>
  );
}
