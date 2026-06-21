import { memo, useEffect, useRef, useState } from 'react'

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

const getRemainingSeconds = (endsAt) => {
  if (!endsAt) return null
  const ms = new Date(endsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 1000))
}

const BattleTimer = memo(({ endsAt, onExpire, label = 'Time left' }) => {
  const [remaining, setRemaining] = useState(() => getRemainingSeconds(endsAt))
  const expiredRef = useRef(false)

  useEffect(() => {
    expiredRef.current = false
    setRemaining(getRemainingSeconds(endsAt))
  }, [endsAt])

  useEffect(() => {
    if (!endsAt) return undefined

    const tick = () => {
      const next = getRemainingSeconds(endsAt)
      setRemaining((current) => (current === next ? current : next))
      if (next <= 0 && !expiredRef.current) {
        expiredRef.current = true
        onExpire?.()
      }
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt, onExpire])

  const urgent = remaining != null && remaining <= 30

  return (
    <div className={`battle-timer${urgent ? ' battle-timer--urgent' : ''}`} aria-live="polite">
      <span className="battle-timer-label">{label}</span>
      <span className="battle-timer-value">
        {remaining != null ? formatTime(remaining) : '--:--'}
      </span>
    </div>
  )
})

BattleTimer.displayName = 'BattleTimer'

export default BattleTimer
