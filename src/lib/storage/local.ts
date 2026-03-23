/**
 * Client-side localStorage persistence for tasks & escrows.
 * Vercel serverless is stateless — in-memory store is lost between requests.
 * This keeps task data alive across page refreshes for the hackathon demo.
 */

const TASKS_KEY = 'forba_tasks';
const ESCROWS_KEY = 'forba_escrows';

// ── Task types ──────────────────────────────────────────────────────────────

export interface StoredSubtask {
  id: string;
  taskId: string;
  description: string;
  type: string;
  status: string;
  assignedAgent?: { id: string; name: string; type: string } | null;
  deliverable?: string;
  evaluationReason?: string;
  escrow?: {
    id: string;
    amount: number;
    status: string;
    fundTxHash?: string;
    releaseTxHash?: string;
  } | null;
}

export interface StoredTask {
  id: string;
  description: string;
  status: string;
  subtasks: StoredSubtask[];
  finalResult?: string;
  createdAt: string;
  completedAt?: string;
}

export interface StoredEscrow {
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

// ── Helpers ─────────────────────────────────────────────────────────────────

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or blocked — silently ignore
  }
}

// ── Tasks ───────────────────────────────────────────────────────────────────

export function getStoredTasks(): StoredTask[] {
  return readJSON<StoredTask[]>(TASKS_KEY, []);
}

export function getStoredTask(taskId: string): StoredTask | null {
  const tasks = getStoredTasks();
  return tasks.find((t) => t.id === taskId) || null;
}

export function saveTask(task: StoredTask): void {
  const tasks = getStoredTasks();
  const idx = tasks.findIndex((t) => t.id === task.id);
  if (idx >= 0) {
    tasks[idx] = task;
  } else {
    tasks.unshift(task); // newest first
  }
  // Keep only last 50 tasks
  writeJSON(TASKS_KEY, tasks.slice(0, 50));
}

export function clearStoredTasks(): void {
  if (isBrowser()) localStorage.removeItem(TASKS_KEY);
}

// ── Escrows ─────────────────────────────────────────────────────────────────

export function getStoredEscrows(): StoredEscrow[] {
  return readJSON<StoredEscrow[]>(ESCROWS_KEY, []);
}

export function saveEscrows(escrows: StoredEscrow[]): void {
  const existing = getStoredEscrows();
  const merged = [...escrows];
  // Add existing escrows that aren't in the new batch
  for (const e of existing) {
    if (!merged.find((m) => m.id === e.id)) {
      merged.push(e);
    }
  }
  writeJSON(ESCROWS_KEY, merged.slice(0, 200));
}

export function clearStoredEscrows(): void {
  if (isBrowser()) localStorage.removeItem(ESCROWS_KEY);
}
