export function getCodingGateAction({ passed = false, attemptCount = 0, inProgress = false } = {}) {
  if (passed) return 'review'
  if (inProgress || attemptCount > 0) return 'continue'
  return 'start'
}
