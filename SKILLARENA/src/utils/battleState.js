export const getBattleFingerprint = (battle) => {
  if (!battle) return ''
  const participantKey = (battle.participants || [])
    .map(
      (participant) =>
        `${participant.userId}:${participant.status}:${participant.score}:${participant.submitted}`,
    )
    .join('|')
  return `${battle.status}:${battle.countdownSeconds ?? 0}:${battle.winnerType ?? ''}:${participantKey}`
}

export const getPollIntervalMs = (status) => {
  if (status === 'IN_PROGRESS') return 5000
  if (status === 'COMPLETED') return 0
  return 2500
}
