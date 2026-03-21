import { NextRequest, NextResponse } from 'next/server';
import { getAllEscrows, getEscrowsByTask } from '@/lib/payments/escrow';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    const escrows = taskId ? getEscrowsByTask(taskId) : getAllEscrows();

    return NextResponse.json(escrows);
  } catch (error) {
    console.error('GET /api/payments error:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}
