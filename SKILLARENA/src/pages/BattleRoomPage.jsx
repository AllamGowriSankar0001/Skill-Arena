import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import BattleQuiz from '../components/BattleQuiz'
import CodingViewportGate from '../components/CodingViewportGate'
import { battleApi } from '../services/api'
import { ROUTES } from '../routes'
import './BattleRoomPage.css'

const BattleRoomPage = () => {
  const { battleId } = useParams()
  const navigate = useNavigate()
  const pollRef = useRef(null)

  const [battle, setBattle] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [remainingSeconds, setRemainingSeconds] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const you = battle?.participants?.find((participant) => participant.isYou)
  const submitted = Boolean(you?.submitted || submitResult)

  const handleSubmit = useCallback(
    async (answers) => {
      if (submitting || submitted) return
      setSubmitting(true)
      setError('')
      try {
        const result = await battleApi.submitQuiz(battleId, answers)
        setSubmitResult(result)
        setBattle(result.battle)
      } catch (err) {
        setError(err.message || 'Submit failed')
      } finally {
        setSubmitting(false)
      }
    },
    [battleId, submitting, submitted],
  )

  const loadBattle = useCallback(async () => {
    const data = await battleApi.getBattle(battleId)
    setBattle(data.battle)
    if (data.battle?.timer?.remainingSeconds != null) {
      setRemainingSeconds(data.battle.timer.remainingSeconds)
    }
    return data.battle
  }, [battleId])

  const loadQuiz = useCallback(async () => {
    try {
      const payload = await battleApi.getQuiz(battleId)
      setQuiz(payload)
      if (payload.timer?.remainingSeconds != null) {
        setRemainingSeconds(payload.timer.remainingSeconds)
      }
    } catch (err) {
      if (err.status !== 400) {
        setError(err.message || 'Unable to load battle questions')
      }
    }
  }, [battleId])

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      try {
        const current = await loadBattle()
        if (!mounted) return
        if (current?.status === 'IN_PROGRESS' && current.mode === 'QUIZ') {
          await loadQuiz()
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
  }, [loadBattle, loadQuiz])

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const current = await loadBattle()
        if (current?.status === 'IN_PROGRESS' && current.mode === 'QUIZ' && !quiz) {
          await loadQuiz()
        }
        if (current?.status === 'COMPLETED') {
          clearInterval(pollRef.current)
        }
      } catch {
        /* ignore poll errors */
      }
    }, 2000)

    return () => clearInterval(pollRef.current)
  }, [loadBattle, loadQuiz, quiz])

  useEffect(() => {
    if (remainingSeconds == null || remainingSeconds <= 0 || submitted) return undefined

    const tick = setInterval(() => {
      setRemainingSeconds((current) => (current != null && current > 0 ? current - 1 : 0))
    }, 1000)

    return () => clearInterval(tick)
  }, [remainingSeconds, submitted])

  useEffect(() => {
    if (remainingSeconds !== 0 || battle?.status !== 'IN_PROGRESS' || submitted || !quiz) {
      return
    }
    handleSubmit({})
  }, [remainingSeconds, battle?.status, submitted, quiz, handleSubmit])

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
        <Link to={ROUTES.battles} className="battle-room-back">
          Back to battles
        </Link>
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
            {battle?.difficulty} · Room {battle?.battleCode} · <span className={`battle-status battle-status--${battle?.status?.toLowerCase()}`}>{statusLabel}</span>
          </p>
        </div>
        <Link to={ROUTES.battles} className="battle-room-back">
          Exit
        </Link>
      </header>

      {error ? <p className="battle-room-banner battle-room-banner--error">{error}</p> : null}

      <div className="battle-room-grid">
        <aside className="battle-room-sidebar">
          <h2 className="battle-room-sidebar-title">Players</h2>
          <ul className="battle-player-list">
            {(battle?.participants || []).map((participant) => (
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
                  {participant.submitted ? `${participant.score} pts` : participant.status}
                </span>
              </li>
            ))}
          </ul>
        </aside>

        <section className="battle-room-main">
          {battle?.status === 'STARTING' && battle.countdownSeconds > 0 ? (
            <div className="battle-countdown">
              <p className="battle-countdown-label">Match locked in</p>
              <p className="battle-countdown-value">{battle.countdownSeconds}</p>
              <p className="battle-countdown-hint">Same questions · Shared timer · Fight!</p>
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

          {battle?.status === 'IN_PROGRESS' && battle.mode === 'QUIZ' && quiz ? (
            <BattleQuiz
              questions={quiz.questions || []}
              remainingSeconds={remainingSeconds}
              onSubmit={handleSubmit}
              submitting={submitting}
              submitted={submitted}
              result={submitResult}
            />
          ) : null}

          {battle?.status === 'IN_PROGRESS' && battle.mode === 'CODING' ? (
            <CodingViewportGate
              action="start"
              contextLabel="coding battle"
              backTo={ROUTES.battles}
              backLabel="← Back to battles"
            >
              <div className="battle-waiting">
                <p className="battle-waiting-title">Coding battle arena</p>
                <p className="battle-waiting-meta">Coding battle UI is launching in the next update.</p>
              </div>
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
              <ul className="battle-results-list">
                {(battle.participants || [])
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .map((participant) => (
                    <li key={participant.userId} className="battle-results-row">
                      <span>{participant.name}{participant.isYou ? ' (You)' : ''}</span>
                      <span>{participant.correctAnswers} correct · {participant.score} pts</span>
                    </li>
                  ))}
              </ul>
              <button type="button" className="battle-start-btn" onClick={() => navigate(ROUTES.battles)}>
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
