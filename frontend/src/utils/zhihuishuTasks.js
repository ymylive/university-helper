export const applyCourseProgressToTaskRecords = (
  taskRecords,
  { courseId, activeTaskId, progress, updatedAt }
) => {
  if (!courseId || !activeTaskId) {
    return taskRecords
  }

  const statusValue = String(progress?.status || 'running')
  const messageValue = progress?.message || '进度已更新'
  const currentVideo = progress?.current_video || progress?.currentTask || ''
  const total = Number(progress?.total ?? 0) || 0
  const completed = Number(progress?.completed ?? 0) || 0
  const failed = Number(progress?.failed ?? 0) || 0
  const percentage = Number(progress?.percentage ?? 0) || 0

  return taskRecords.map((task) => {
    if (task.taskId !== activeTaskId || task.courseId !== courseId) {
      return task
    }

    return {
      ...task,
      status: statusValue,
      message: messageValue,
      currentTask: currentVideo,
      total,
      completed,
      failed,
      percentage,
      updatedAt,
      progress: {
        ...(task.progress || {}),
        ...(progress || {}),
        status: statusValue,
        message: messageValue,
        current_video: currentVideo,
        total,
        completed,
        failed,
        percentage,
      },
    }
  })
}
