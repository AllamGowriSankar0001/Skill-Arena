import { describe, expect, it } from 'vitest'
import { getLessonStateLabel } from './lessonProgress'

describe('getLessonStateLabel', () => {
  it('returns locked state', () => {
    expect(getLessonStateLabel({ lockState: 'LOCKED', status: 'NOT_STARTED' })).toEqual({
      label: 'Locked',
      className: 'locked',
    })
  })

  it('returns completed state', () => {
    expect(getLessonStateLabel({ lockState: 'UNLOCKED', status: 'COMPLETED' })).toEqual({
      label: 'Completed',
      className: 'completed',
    })
  })
})
