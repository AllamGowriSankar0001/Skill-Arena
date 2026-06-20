export function getLessonStateLabel(lessonProgress) {
  if (!lessonProgress) return { label: 'Not Started', className: 'not-started' }
  if (lessonProgress.lockState === 'LOCKED') return { label: 'Locked', className: 'locked' }
  if (lessonProgress.status === 'COMPLETED') return { label: 'Completed', className: 'completed' }
  if (lessonProgress.status === 'IN_PROGRESS') return { label: 'In Progress', className: 'in-progress' }
  return { label: 'Not Started', className: 'not-started' }
}
