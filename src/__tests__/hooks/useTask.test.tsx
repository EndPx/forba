import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTasks, useTaskDetail } from '@/hooks/useTask';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock localStorage
const localStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: vi.fn((key: string) => localStore[key] ?? null),
  setItem: vi.fn((key: string, val: string) => { localStore[key] = val; }),
  removeItem: vi.fn((key: string) => { delete localStore[key]; }),
  clear: vi.fn(() => { Object.keys(localStore).forEach(k => delete localStore[k]); }),
  get length() { return Object.keys(localStore).length; },
  key: vi.fn((i: number) => Object.keys(localStore)[i] ?? null),
};
vi.stubGlobal('localStorage', mockLocalStorage);

function makeResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
  mockLocalStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ──────────────────────────────────────────────────────────────────────────────
// useTasks
// ──────────────────────────────────────────────────────────────────────────────
describe('useTasks()', () => {
  it('initializes with empty tasks and loading=false', () => {
    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('fetchTasks() calls GET /api/tasks and sets tasks', async () => {
    const taskData = [
      { id: 't1', description: 'Task 1', status: 'completed', subtaskCount: 2, completedSubtasks: 2, createdAt: 'now' },
    ];
    mockFetch.mockReturnValueOnce(makeResponse(taskData));

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      await result.current.fetchTasks();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/tasks');
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].id).toBe('t1');
  });

  it('fetchTasks() falls back to localStorage when server returns empty', async () => {
    // Pre-populate localStorage
    const storedTask = {
      id: 'stored-1',
      description: 'Stored task',
      status: 'completed',
      subtasks: [{ id: 's1', taskId: 'stored-1', description: 'sub', type: 'code', status: 'approved' }],
      createdAt: 'now',
    };
    localStore['forba_tasks'] = JSON.stringify([storedTask]);

    mockFetch.mockReturnValueOnce(makeResponse([]));

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      await result.current.fetchTasks();
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].id).toBe('stored-1');
  });

  it('fetchTasks() handles network errors and uses localStorage', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      await result.current.fetchTasks();
    });

    expect(result.current.tasks).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('createTask() sends POST with description and saves to localStorage', async () => {
    const createdResponse = {
      taskId: 'new-task-id',
      status: 'completed',
      task: {
        id: 'new-task-id',
        description: 'My task',
        status: 'completed',
        subtasks: [],
        createdAt: 'now',
      },
    };

    mockFetch.mockReturnValueOnce(makeResponse(createdResponse, 202));

    const { result } = renderHook(() => useTasks());

    let created: unknown;
    await act(async () => {
      created = await result.current.createTask('My task');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'My task' }),
    }));

    expect(created).toEqual(createdResponse);
    // Task saved to localStorage
    const stored = JSON.parse(localStore['forba_tasks'] || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('new-task-id');
  });

  it('createTask() throws on fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Server down'));

    const { result } = renderHook(() => useTasks());

    await expect(
      act(async () => {
        await result.current.createTask('Failing task');
      })
    ).rejects.toThrow('Server down');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// useTaskDetail
// ──────────────────────────────────────────────────────────────────────────────
describe('useTaskDetail()', () => {
  it('initializes with null task and loading=false', () => {
    const { result } = renderHook(() => useTaskDetail('task-123'));
    expect(result.current.task).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('fetchTask() calls GET /api/tasks/:id and sets task', async () => {
    const taskDetail = {
      id: 'task-123',
      description: 'Full task',
      status: 'completed',
      subtasks: [],
      createdAt: 'now',
    };
    mockFetch.mockReturnValueOnce(makeResponse(taskDetail));

    const { result } = renderHook(() => useTaskDetail('task-123'));

    await act(async () => {
      await result.current.fetchTask();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/tasks/task-123');
    expect(result.current.task).not.toBeNull();
    expect(result.current.task!.id).toBe('task-123');
  });

  it('falls back to localStorage when server returns 404', async () => {
    const storedTask = {
      id: 'task-404',
      description: 'Stored detail',
      status: 'completed',
      subtasks: [{ id: 's1', taskId: 'task-404', description: 'sub', type: 'code', status: 'approved' }],
      createdAt: 'now',
    };
    localStore['forba_tasks'] = JSON.stringify([storedTask]);

    mockFetch.mockReturnValueOnce(makeResponse({ error: 'Not found' }, 404));

    const { result } = renderHook(() => useTaskDetail('task-404'));

    await act(async () => {
      await result.current.fetchTask();
    });

    expect(result.current.task).not.toBeNull();
    expect(result.current.task!.id).toBe('task-404');
  });

  it('does not fetch when taskId is null', async () => {
    const { result } = renderHook(() => useTaskDetail(null));

    await act(async () => {
      await result.current.fetchTask();
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.task).toBeNull();
  });

  it('handles fetch errors gracefully with localStorage fallback', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Not found'));

    const { result } = renderHook(() => useTaskDetail('bad-id'));

    await act(async () => {
      await result.current.fetchTask();
    });

    expect(result.current.task).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('sets loading=false after successful fetch', async () => {
    mockFetch.mockReturnValueOnce(makeResponse({ id: 'task-abc', description: 'd', status: 'pending', subtasks: [], createdAt: 'now' }));

    const { result } = renderHook(() => useTaskDetail('task-abc'));
    await act(async () => {
      await result.current.fetchTask();
    });

    expect(result.current.loading).toBe(false);
  });
});
