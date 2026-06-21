import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BattleCoding from '../components/BattleCoding'
import BattleQuiz from '../components/BattleQuiz'
import CodingViewportGate from '../components/CodingViewportGate'
import { battleApi } from '../services/api'
import { ROUTES } from '../routes'
import { getBattleFingerprint, getPollIntervalMs } from '../utils/battleState'
import './BattleRoomPage.css'

const formatDuration = (seconds) => {
  if (seconds == null) return '—'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

const BattlePlayerSidebar = memo(({ participants = [] }) => (
  <aside className="battle-room-sidebar">
    <h2 className="battle-room-sidebar-title">Players</h2>
    <ul className="battle-player-list">
      {participants.map((participant) => (
        <li
          key={participant.userId}
          className={`battle-player${participant.isYou ? ' is-you' : ''}${
            participant.submitted ? ' is-done' : ''
          }`}
        >
          <span className="battle-player-team">Team {participant.team}</span>
          <span className="battle-player-name">
            {participant.name}
            {participant.isYou ? ' (You)' : ''}
          </span>
          <span className="battle-player-score">
            {participant.submitted
              ? `${participant.score} pts · ${formatDuration(participant.timeTakenSeconds)}`
              : participant.status}
          </span>
        </li>
      ))}
    </ul>
  </aside>
))

BattlePlayerSidebar.displayName = 'BattlePlayerSidebar'

const BattleRoomPage = () => {
  const { battleId } = useParams()
  const navigate = useNavigate()
  const pollRef = useRef(null)
  const codingCodeRef = useRef({ html: '', css: '', javascript: '' })
  const exitCalledRef = useRef(false)
  const battleFingerprintRef = useRef('')
  const battleStatusRef = useRef(null)
  const payloadLoadedRef = useRef(false)
  const submittedRef = useRef(false)

  const [battle, setBattle] = useState(null)
  const [payload, setPayload] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const you = battle?.participants?.find((participant) => participant.isYou)
  const submitted = Boolean(you?.submitted || submitResult)
  submittedRef.current = submitted
  const isCoding = battle?.mode === 'CODING'
  const timerEndsAt = payload?.timer?.endsAt || battle?.timer?.endsAt || null

  useEffect(() => {
    battleFingerprintRef.current = ''
    battleStatusRef.current = null
    payloadLoadedRef.current = false
    exitCalledRef.current = false
    submittedRef.current = false
    setPayload(null)
    setSubmitResult(null)
    setBattle(null)
    setLoading(true)
  }, [battleId])

  const applyBattle = useCallback((nextBattle) => {
    const fingerprint = getBattleFingerprint(nextBattle)
    if (fingerprint === battleFingerprintRef.current) return nextBattle
    battleFingerprintRef.current = fingerprint
    battleStatusRef.current = nextBattle?.status ?? null
    setBattle(nextBattle)
    return nextBattle
  }, [])

  const leaveRoom = useCallback(async () => {
    if (exitCalledRef.current) return
    exitCalledRef.current = true
    try {
      await battleApi.leaveBattle(battleId)
    } catch {
      /* best effort */
    }
  }, [battleId])

  const handleExit = useCallback(async () => {
    await leaveRoom()
    navigate(ROUTES.battles)
  }, [leaveRoom, navigate])

  const handleSubmitQuiz = useCallback(
    async (answers) => {
      if (submitting || submittedRef.current) return
      setSubmitting(true)
      setError('')
      try {
        const result = await battleApi.submitQuiz(battleId, answers)
        setSubmitResult(result)
        applyBattle(result.battle)
      } catch (err) {
        setError(err.message || 'Submit failed')
      } finally {
        setSubmitting(false)
      }
    },
    [battleId, submitting, applyBattle],
  )

  const handleRunCoding = useCallback(
    async (code) => {
      codingCodeRef.current = code
      return battleApi.runCoding(battleId, code)
    },
    [battleId],
  )

  const handleSubmitCoding = useCallback(
    async (code) => {
      if (submitting || submittedRef.current) return
      setSubmitting(true)
      setError('')
      try {
        codingCodeRef.current = code
        const result = await battleApi.submitCoding(battleId, code)
        setSubmitResult(result)
        applyBattle(result.battle)
      } catch (err) {
        setError(err.message || 'Submit failed')
        throw err
      } finally {
        setSubmitting(false)
      }
    },
    [battleId, submitting, applyBattle],
  )

  const handleQuizTimeUp = useCallback(
    (answers) => {
      handleSubmitQuiz(answers || {})
    },
    [handleSubmitQuiz],
  )

  const handleCodingTimeUp = useCallback(
    (code) => {
      handleSubmitCoding(code || codingCodeRef.current)
    },
    [handleSubmitCoding],
  )

  const loadBattle = useCallback(async () => {
    const data = await battleApi.getBattle(battleId)
    return applyBattle(data.battle)
  }, [battleId, applyBattle])

  const loadPayload = useCallback(async () => {
    if (payloadLoadedRef.current) return
    try {
      const nextPayload = await battleApi.getQuiz(battleId)
      payloadLoadedRef.current = true
      setPayload(nextPayload)
      if (nextPayload.mode === 'CODING' && nextPayload.challenge?.starterCode) {
        codingCodeRef.current = nextPayload.challenge.starterCode
      }
    } catch (err) {
      if (err.status !== 400) {
        setError(err.message || 'Unable to load battle content')
      }
    }
  }, [battleId])

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      try {
        const current = await loadBattle()
        if (!mounted) return
        if (current?.status === 'IN_PROGRESS') {
          await loadPayload()
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Battle not found')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    bootstrap()
    return () => {
      mounted = false
    }
  }, [loadBattle, loadPayload])

  useEffect(() => {
    const poll = async () => {
      try {
        const current = await loadBattle()
        if (!current) return

        if (current.status === 'IN_PROGRESS' && !payloadLoadedRef.current) {
          await loadPayload()
        }

        if (current.status === 'COMPLETED') {
          clearInterval(pollRef.current)
        }
      } catch {
        /* ignore poll errors */
      }
    }

    poll()

    const schedule = () => {
      clearInterval(pollRef.current)
      const intervalMs = getPollIntervalMs(battleStatusRef.current)
      if (!intervalMs) return
      pollRef.current = setInterval(poll, intervalMs)
    }

    schedule()
    return () => clearInterval(pollRef.current)
  }, [loadBattle, loadPayload, battle?.status])

  useEffect(
    () => () => {
      leaveRoom()
    },
    [leaveRoom],
  )

  if (loading) {
    return (
      <div className="battle-room-page battle-room-page--boot">
        <div className="battle-room-boot">
          <span className="battle-room-boot-vs">VS</span>
          <p>Syncing arena…</p>
        </div>
      </div>
    )
  }

  if (error && !battle) {
    return (
      <div className="battle-room-page">
        <div className="battle-room-error">{error}</div>
        <button type="button" className="battle-room-back" onClick={handleExit}>
          Back to battles
        </button>
      </div>
    )
  }

  const statusLabel = {
    WAITING: 'Waiting for players',
    MATCHED: 'Generating questions with AI…',
    STARTING: 'Starting soon',
    IN_PROGRESS: 'Live',
    COMPLETED: 'Finished',
    CANCELLED: 'Cancelled',
  }[battle?.status] || battle?.status

  return (
    <div className="battle-room-page">
      <header className="battle-room-header">
        <div>
          <p className="battle-room-eyebrow">{battle?.skill?.name || 'Skill Arena'} · {battle?.mode}</p>
          <h1 className="battle-room-title">
            {battle?.format === 'THREE_V_THREE' ? '3v3 Squad Battle' : '1v1 Duel'}
          </h1>
          <p className="battle-room-meta">
            {battle?.difficulty} · Room {battle?.battleCode} ·{' '}
            <span className={`battle-status battle-status--${battle?.status?.toLowerCase()}`}>{statusLabel}</span>
          </p>
        </div>
        <button type="button" className="battle-room-back" onClick={handleExit}>
          Exit
        </button>
      </header>

      {error ? <p className="battle-room-banner battle-room-banner--error">{error}</p> : null}

      <div className="battle-room-grid">
        <BattlePlayerSidebar participants={battle?.participants || []} />

        <section className="battle-room-main">
          {battle?.status === 'STARTING' && battle.countdownSeconds > 0 ? (
            <div className="battle-countdown">
              <p className="battle-countdown-label">Match locked in</p>
              <p className="battle-countdown-value">{battle.countdownSeconds}</p>
              <p className="battle-countdown-hint">Same challenge · Shared timer · Fight!</p>
            </div>
          ) : null}

          {['MATCHED', 'WAITING'].includes(battle?.status) ? (
            <div className="battle-waiting">
              <div className="battle-waiting-spinner" aria-hidden="true" />
              <p className="battle-waiting-title">
                {battle.status === 'MATCHED'
                  ? 'Forging battle questions…'
                  : 'Waiting for squad…'}
              </p>
              <p className="battle-waiting-meta">
                {battle.participantCount}/{battle.maximumPlayers} fighters ready ·{' '}
                {battle.format === 'THREE_V_THREE' ? '3v3' : '1v1'} · {battle.mode}
              </p>
              {battle.status === 'WAITING' && battle.isHost ? (
                <button
                  type="button"
                  className="battle-start-btn"
                  disabled={battle.participantCount < 2}
                  onClick={async () => {
                    await battleApi.startFriendBattle(battleId)
                    await loadBattle()
                  }}
                >
                  Start battle
                </button>
              ) : null}
            </div>
          ) : null}

          {battle?.status === 'IN_PROGRESS' && battle.mode === 'QUIZ' && payload?.mode === 'QUIZ' ? (
            <BattleQuiz
              questions={payload.questions || []}
              timerEndsAt={timerEndsAt}
              onSubmit={handleSubmitQuiz}
              onTimeUp={handleQuizTimeUp}
              submitting={submitting}
              submitted={submitted}
              result={submitResult}
            />
          ) : null}

          {battle?.status === 'IN_PROGRESS' && isCoding && payload?.mode === 'CODING' ? (
            <CodingViewportGate
              action="start"
              contextLabel="coding battle"
              backTo={ROUTES.battles}
              backLabel="← Back to battles"
            >
              <BattleCoding
                challenge={payload.challenge}
                timerEndsAt={timerEndsAt}
                onRun={handleRunCoding}
                onSubmit={handleSubmitCoding}
                onTimeUp={handleCodingTimeUp}
                submitting={submitting}
                submitted={submitted}
                result={submitResult}
              />
            </CodingViewportGate>
          ) : null}

          {battle?.status === 'COMPLETED' ? (
            <div className="battle-results">
              <h2 className="battle-results-title">
                {battle.winnerType === 'DRAW'
                  ? 'Draw!'
                  : battle.winnerUserId && battle.winnerUserId === you?.userId
                    ? 'You won!'
                    : battle.winnerTeam && battle.winnerTeam === you?.team
                      ? 'Your team won!'
                      : 'Battle complete'}
              </h2>
              <p className="battle-results-note">
                Ties on score are broken by accuracy, then fastest completion time.
              </p>
              <ul className="battle-results-list">
                {(battle.participants || [])
                  .slice()
                  .sort(
                    (a, b) =>
                      b.score - a.score ||
                      (a.timeTakenSeconds ?? 9999) - (b.timeTakenSeconds ?? 9999),
                  )
                  .map((participant) => (
                    <li key={participant.userId} className="battle-results-row">
                      <span>
                        {participant.name}
                        {participant.isYou ? ' (You)' : ''}
                      </span>
                      <span>
                        {participant.correctAnswers} correct · {participant.score} pts ·{' '}
                        {formatDuration(participant.timeTakenSeconds)}
                      </span>
                    </li>
                  ))}
              </ul>
              <button type="button" className="battle-start-btn" onClick={handleExit}>
                Find another match
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}

export default BattleRoomPage
