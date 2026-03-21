import { v4 as uuidv4 } from 'uuid';
import { Task, Agent } from '../types';

// ============================================================
// In-Memory Data Store - Singleton
// ============================================================

class ForbaStore {
  private tasks: Map<string, Task> = new Map();
  private agents: Map<string, Agent> = new Map();

  // --- Task Operations ---

  createTask(description: string): Task {
    const task: Task = {
      id: uuidv4(),
      description,
      status: 'pending',
      subtasks: [],
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  updateTask(id: string, updates: Partial<Task>): Task {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task not found: ${id}`);
    const updated = { ...task, ...updates };
    this.tasks.set(id, updated);
    return updated;
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // --- Agent Operations ---

  registerAgent(agent: Agent): Agent {
    this.agents.set(agent.id, agent);
    return agent;
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  updateAgent(id: string, updates: Partial<Agent>): Agent {
    const agent = this.agents.get(id);
    if (!agent) throw new Error(`Agent not found: ${id}`);
    const updated = { ...agent, ...updates };
    this.agents.set(id, updated);
    return updated;
  }

  getAgentsByType(type: string): Agent[] {
    return Array.from(this.agents.values()).filter(
      (a) => a.type === type && a.status !== 'offline'
    );
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  // --- Stats ---

  getStats(): {
    totalTasks: number;
    completedTasks: number;
    activeTasks: number;
    totalAgents: number;
    totalPayments: number;
  } {
    const tasks = this.getAllTasks();
    return {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === 'completed').length,
      activeTasks: tasks.filter((t) => ['pending', 'decomposing', 'in_progress'].includes(t.status)).length,
      totalAgents: this.agents.size,
      totalPayments: 0, // Will be calculated from escrows
    };
  }

  // --- Reset (for testing) ---

  reset(): void {
    this.tasks.clear();
    this.agents.clear();
  }
}

// Singleton export
export const store = new ForbaStore();
