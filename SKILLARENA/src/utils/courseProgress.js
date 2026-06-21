export function hasStartedCourse(enrollment, lessons = []) {
  if (!enrollment) return false
  if (enrollment.hasStarted) return true
  if (enrollment.status === 'COMPLETED') return true
  if (enrollment.completedLessonCount > 0) return true
  if (enrollment.progressPercentage > 0) return true

  return lessons.some(
    (lesson) => lesson.status === 'IN_PROGRESS' || lesson.status === 'COMPLETED',
  )
}

export function getCourseCtaLabel(enrollment, lessons = []) {
  if (enrollment?.status === 'COMPLETED') return 'Review course'
  if (hasStartedCourse(enrollment, lessons)) return 'Continue learning'
  return 'Start learning'
}

export function getCourseStatusLabel(enrollment, lessons = []) {
  if (!enrollment) return null
  if (enrollment.status === 'COMPLETED') return 'Completed'
  if (hasStartedCourse(enrollment, lessons)) return 'In progress'
  return 'Not started'
}
