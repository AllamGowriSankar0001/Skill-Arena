export const PRACTICE_MODE_META = {
  QUIZ: { label: 'MCQ Quiz', icon: '✓' },
  CODING: { label: 'Coding', icon: '{ }' },
  MIXED: { label: 'Mixed', icon: '◆' },
}

export const getPracticeModeMeta = (assessment = {}) => {
  if (assessment.sessionType === 'CODING') {
    return PRACTICE_MODE_META.CODING
  }
  if (assessment.mode && PRACTICE_MODE_META[assessment.mode]) {
    return PRACTICE_MODE_META[assessment.mode]
  }
  return PRACTICE_MODE_META.QUIZ
}

export const getPracticeModeKey = (assessment = {}) => {
  if (assessment.sessionType === 'CODING') return 'coding'
  const mode = (assessment.mode || 'QUIZ').toLowerCase()
  if (mode === 'coding') return 'coding'
  if (mode === 'mixed') return 'mixed'
  return 'quiz'
}
