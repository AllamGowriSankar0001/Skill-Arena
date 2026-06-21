export function applyXpUpdate(response, { updateUser, showSuccess, showInfo } = {}) {
  if (response?.user && updateUser) {
    updateUser(response.user)
  }

  const earned = response?.xp?.earned ?? 0
  const reversed = response?.xp?.reversed ?? 0

  if (earned > 0 && showSuccess) {
    const levelText =
      response.user?.level && response.user?.xp != null
        ? ` · ${response.user.xp.toLocaleString()} XP total`
        : ''
    showSuccess(`+${earned} XP earned${levelText}`)
    return
  }

  if (reversed > 0 && showInfo) {
    showInfo(`${reversed} XP adjusted`)
  }
}

export function formatXpLabel(value = 0) {
  return `${Number(value || 0).toLocaleString()} XP`
}
