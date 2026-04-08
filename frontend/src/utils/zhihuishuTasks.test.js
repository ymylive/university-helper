import { describe, expect, test } from 'vitest'

import { applyCourseProgressToTaskRecords } from './zhihuishuTasks'

describe('applyCourseProgressToTaskRecords', () => {
  test('updates only the active task when multiple tasks share one course', () => {
    const tasks = [
      {
        taskId: 'old-task',
        courseId: '1001',
        status: 'running',
        message: 'Old task still running',
        currentTask: 'Video 2',
        progress: { status: 'running', total: 3, completed: 1, percentage: 33.33 },
      },
      {
        taskId: 'active-task',
        courseId: '1001',
        status: 'running',
        message: 'Active task running',
        currentTask: 'Video 1',
        progress: { status: 'running', total: 2, completed: 1, percentage: 50 },
      },
    ]

    const updated = applyCourseProgressToTaskRecords(tasks, {
      courseId: '1001',
      activeTaskId: 'active-task',
      progress: {
        status: 'completed',
        message: 'Task completed',
        total: 2,
        completed: 2,
        failed: 0,
        percentage: 100,
        current_video: '',
      },
      updatedAt: '2026-03-31T00:00:00.000Z',
    })

    expect(updated[0].status).toBe('running')
    expect(updated[0].message).toBe('Old task still running')
    expect(updated[1].status).toBe('completed')
    expect(updated[1].message).toBe('Task completed')
    expect(updated[1].progress.completed).toBe(2)
  })

  test('does not overwrite task list when task id is unknown', () => {
    const tasks = [
      {
        taskId: 'task-a',
        courseId: '1001',
        status: 'running',
        message: 'Task A running',
        currentTask: 'Video 1',
        progress: { status: 'running', total: 2, completed: 1, percentage: 50 },
      },
    ]

    const updated = applyCourseProgressToTaskRecords(tasks, {
      courseId: '1001',
      activeTaskId: '',
      progress: {
        status: 'completed',
        message: 'Task completed',
        total: 2,
        completed: 2,
        failed: 0,
        percentage: 100,
        current_video: '',
      },
      updatedAt: '2026-03-31T00:00:00.000Z',
    })

    expect(updated).toEqual(tasks)
  })
})
