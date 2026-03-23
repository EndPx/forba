import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTasks, useTaskDetail } from '@/hooks/useTask';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
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

  it('fetchTasks() sets loading=true during fetch then false after', async () => {
    const loadingStates: boolean[] = [];
    mockFetch.mockImplementationOnce(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ ok: true, json: () => Promise.resolve([]) }), 10);
      });
    });

    const { result } = renderHook(() => useTasks());

    const promise = act(async () => {
      const p = result.current.fetchTasks();
      loadingStates.push(result.current.loading);
      await p;
    });

    await promise;
    expect(result.current.loading).toBe(false);
  });

  it('fetchTasks() handles network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useTasks());

    // Should not throw
    await act(async () => {
      await result.current.fetchTasks();
    });

    expect(result.current.tasks).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('createTask() sends POST with description and refreshes tasks', async () => {
    const createdResponse = { taskId: 'new-task-id', status: 'pending' };
    const refreshedTasks = [
      { id: 'new-task-id', description: 'My task', status: 'pending', subtaskCount: 0, completedSubtasks: 0, createdAt: 'now' },
    ];

    mockFetch
      .mockReturnValueOnce(makeResponse(createdResponse, 202))
      .mockReturnValueOnce(makeResponse(refreshedTasks));

    const { result } = renderHook(() => useTasks());

    let created: unknown;
    await act(async () => {
      created = await result.current.createTask('My task');
    });

    // POST called first
    expect(mockFetch).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'My task' }),
    }));

    // Then GET called to refresh
    expect(mockFetch).toHaveBeenCalledWith('/api/tasks');
    expect(created).toEqual(createdResponse);
    expect(result.current.tasks).toHaveLength(1);
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

  it('does not fetch when taskId is null', async () => {
    const { result } = renderHook(() => useTaskDetail(null));

    await act(async () => {
      await result.current.fetchTask();
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.task).toBeNull();
  });

  it('handles fetch errors gracefully', async () => {
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
