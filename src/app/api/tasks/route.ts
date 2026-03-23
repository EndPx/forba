import { NextRequest } from 'next/server';
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
      return new Response(JSON.stringify({ error: 'Description is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (description.length > 2000) {
      return new Response(JSON.stringify({ error: 'Description must be under 2000 characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ensure agents are seeded
    await seedAgents();

    // Create task
    const task = store.createTask(description.trim());

    // Stream progress events back to client as NDJSON
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        function send(data: Record<string, unknown>) {
          try {
            controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
          } catch {
            // Stream closed
          }
        }

        // Send initial task created event
        send({
          type: 'progress',
          event: 'task:created',
          taskId: task.id,
          message: `Task created: ${description.substring(0, 80)}`,
          timestamp: new Date().toISOString(),
        });

        // Subscribe to all events for this task
        const unsubscribe = emitter.subscribe((event) => {
          if (event.taskId === task.id) {
            send({
              type: 'progress',
              event: event.type,
              taskId: event.taskId,
              subtaskId: event.subtaskId,
              agentId: event.agentId,
              message: event.message,
              data: event.data,
              timestamp: event.timestamp,
            });
          }
        });

        // Execute task — events stream as they happen
        executeTask(task.id)
          .then(async () => {
            // Send final task state with full data
            const finalTask = store.getTask(task.id) || task;
            const { getEscrowsByTask } = await import('@/lib/payments/escrow');
            const escrows = getEscrowsByTask(task.id);

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

            send({
              type: 'result',
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
            });
          })
          .catch((error) => {
            console.error('Task execution error:', error);
            send({
              type: 'result',
              taskId: task.id,
              status: 'failed',
              task: {
                id: task.id,
                description: task.description,
                status: 'failed',
                subtasks: [],
                createdAt: task.createdAt,
                completedAt: new Date().toISOString(),
              },
            });
          })
          .finally(() => {
            unsubscribe();
            try {
              controller.close();
            } catch {
              // Already closed
            }
          });
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('POST /api/tasks error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create task' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
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

    return new Response(JSON.stringify(summary), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch tasks' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
