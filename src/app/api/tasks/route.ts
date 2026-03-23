import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { emitter } from '@/lib/events/emitter';
import { executeTask } from '@/lib/agents/orchestrator';
import { seedAgents } from '@/lib/agents/registry';

// Vercel serverless max duration — Hobby=10s, Pro=60s
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description } = body;

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    if (description.length > 2000) {
      return NextResponse.json({ error: 'Description must be under 2000 characters' }, { status: 400 });
    }

    // Ensure agents are seeded
    await seedAgents();

    // Create task
    const task = store.createTask(description.trim());

    emitter.emit('task:created', {
      taskId: task.id,
      message: `New task: ${description.substring(0, 100)}`,
      data: { description },
    });

    // Execute task synchronously — must complete before response
    // Simulation mode completes in ~5s, real LLM in ~15-30s
    try {
      await executeTask(task.id);
    } catch (error) {
      console.error('Task execution error:', error);
    }

    // Return full task state so client can cache it (Vercel serverless is stateless)
    const finalTask = store.getTask(task.id) || task;
    const escrows = (await import('@/lib/payments/escrow')).getEscrowsByTask(task.id);

    const enrichedSubtasks = finalTask.subtasks.map((subtask) => {
      const agent = subtask.assignedAgentId
        ? store.getAgent(subtask.assignedAgentId)
        : null;
      const escrow = escrows.find((e) => e.subtaskId === subtask.id);
      return {
        ...subtask,
        assignedAgent: agent ? { id: agent.id, name: agent.name, type: agent.type } : null,
        escrow: escrow
          ? { id: escrow.id, amount: escrow.amount, status: escrow.status, fundTxHash: escrow.fundTxHash, releaseTxHash: escrow.releaseTxHash }
          : null,
      };
    });

    return NextResponse.json(
      {
        taskId: task.id,
        status: finalTask.status,
        task: {
          id: finalTask.id,
          description: finalTask.description,
          status: finalTask.status,
          subtasks: enrichedSubtasks,
          finalResult: finalTask.finalResult,
          createdAt: finalTask.createdAt,
          completedAt: finalTask.completedAt,
        },
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('POST /api/tasks error:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const tasks = store.getAllTasks();
    const summary = tasks.map((t) => ({
      id: t.id,
      description: t.description,
      status: t.status,
      subtaskCount: t.subtasks.length,
      completedSubtasks: t.subtasks.filter((s) => s.status === 'approved').length,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
    }));

    return NextResponse.json(summary);
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}
