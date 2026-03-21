import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getEscrowsByTask } from '@/lib/payments/escrow';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = store.getTask(id);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const escrows = getEscrowsByTask(id);

    // Enrich subtasks with agent info and escrow data
    const enrichedSubtasks = task.subtasks.map((subtask) => {
      const agent = subtask.assignedAgentId
        ? store.getAgent(subtask.assignedAgentId)
        : null;
      const escrow = escrows.find((e) => e.subtaskId === subtask.id);

      return {
        ...subtask,
        assignedAgent: agent
          ? { id: agent.id, name: agent.name, type: agent.type }
          : null,
        escrow: escrow
          ? {
              id: escrow.id,
              amount: escrow.amount,
              status: escrow.status,
              fundTxHash: escrow.fundTxHash,
              releaseTxHash: escrow.releaseTxHash,
            }
          : null,
      };
    });

    return NextResponse.json({
      ...task,
      subtasks: enrichedSubtasks,
    });
  } catch (error) {
    console.error('GET /api/tasks/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}
