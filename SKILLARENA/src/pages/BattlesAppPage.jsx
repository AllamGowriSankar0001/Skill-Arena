import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { battleApi } from '../services/api'
import { ROUTES } from '../routes'
import './BattlesAppPage.css'

const DEFAULTS = {
  format: 'ONE_V_ONE',
  mode: 'QUIZ',
  difficulty: 'MEDIUM',
  skillId: '',
}

const FORMAT_OPTIONS = [
  {
    id: 'ONE_V_ONE',
    label: '1v1 Duel',
    tagline: 'Head-to-head arena',
    slots: 2,
    teamSize: 1,
  },
  {
    id: 'THREE_V_THREE',
    label: '3v3 Squad',
    tagline: 'Team showdown',
    slots: 6,
    teamSize: 3,
  },
]

const MODE_OPTIONS = [
  { id: 'QUIZ', label: 'Quiz', icon: '⚡', hint: 'Industry MCQ — same questions, shared timer' },
  { id: 'CODING', label: 'Coding', icon: '⌨', hint: 'Live challenge — beat the clock' },
]

const DIFFICULTY_OPTIONS = [
  { id: 'EASY', label: 'Easy', tier: 'bronze' },
  { id: 'MEDIUM', label: 'Medium', tier: 'silver' },
  { id: 'HARD', label: 'Hard', tier: 'gold' },
  { id: 'MIXED', label: 'Mixed', tier: 'mixed' },
]

const formatElapsed = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const ArenaSlot = memo(({ label, filled = false, isYou = false, pulse = false }) => (
  <div
    className={`arena-slot${filled ? ' arena-slot--filled' : ''}${isYou ? ' arena-slot--you' : ''}${
      pulse ? ' arena-slot--pulse' : ''
    }`}
  >
    <span className="arena-slot-avatar">{filled ? (isYou ? 'YOU' : '?') : '—'}</span>
    <span className="arena-slot-label">{label}</span>
  </div>
))

const ArenaRoster = memo(({ format, searching }) => {
  const config = FORMAT_OPTIONS.find((item) => item.id === format) || FORMAT_OPTIONS[0]
  const teamA = Array.from({ length: config.teamSize }, (_, index) => ({
    key: `a-${index}`,
    label: index === 0 ? 'You' : `A${index + 1}`,
    filled: index === 0,
    isYou: index === 0,
    pulse: searching && index > 0,
  }))
  const teamB = Array.from({ length: config.teamSize }, (_, index) => ({
    key: `b-${index}`,
    label: `B${index + 1}`,
    filled: false,
    pulse: searching,
  }))

  return (
    <div className="arena-roster">
      <div className="arena-team arena-team--a">
        <p className="arena-team-name">Team Alpha</p>
        <div className="arena-team-slots">
          {teamA.map((slot) => (
            <ArenaSlot key={slot.key} {...slot} />
          ))}
        </div>
      </div>
      <div className="arena-vs" aria-hidden="true">
        <span>VS</span>
      </div>
      <div className="arena-team arena-team--b">
        <p className="arena-team-name">Team Bravo</p>
        <div className="arena-team-slots">
          {teamB.map((slot) => (
            <ArenaSlot key={slot.key} {...slot} />
          ))}
        </div>
      </div>
    </div>
  )
})

const MatchmakingOverlay = memo(({ settings, meta, elapsed, onCancel }) => {
  const format = FORMAT_OPTIONS.find((item) => item.id === settings.format)
  const mode = MODE_OPTIONS.find((item) => item.id === settings.mode)
  const skill = meta?.skills?.find((item) => item.id === settings.skillId)

  return (
    <div className="arena-match-overlay" role="dialog" aria-modal="true" aria-label="Finding match">
      <div className="arena-match-overlay-inner">
        <div className="arena-radar" aria-hidden="true">
          <span className="arena-radar-ring arena-radar-ring--1" />
          <span className="arena-radar-ring arena-radar-ring--2" />
          <span className="arena-radar-ring arena-radar-ring--3" />
          <span className="arena-radar-core">VS</span>
        </div>

        <p className="arena-match-status">Scanning for opponents</p>
        <h2 className="arena-match-title">Finding fair match…</h2>
        <p className="arena-match-timer">{formatElapsed(elapsed)}</p>

        <div className="arena-match-tags">
          <span>{format?.label}</span>
          <span>{mode?.label}</span>
          <span>{skill?.name || 'Skill'}</span>
          <span>{settings.difficulty}</span>
        </div>

        <ArenaRoster format={settings.format} searching />

        <button type="button" className="arena-btn arena-btn--ghost" onClick={onCancel}>
          Cancel search
        </button>
      </div>
    </div>
  )
})

const BattlesAppPage = () => {
  const navigate = useNavigate()
  const pollRef = useRef(null)
  const searchStartRef = useRef(null)
  const elapsedRef = useRef(null)

  const [meta, setMeta] = useState(null)
  const [settings, setSettings] = useState(DEFAULTS)
  const [queueStatus, setQueueStatus] = useState({ status: 'IDLE' })
  const [friendCode, setFriendCode] = useState('')
  const [playMode, setPlayMode] = useState('ranked')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState([])
  const [searchElapsed, setSearchElapsed] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const [metaData, historyData] = await Promise.all([
          battleApi.meta(),
          battleApi.history().catch(() => ({ battles: [] })),
        ])
        setMeta(metaData)
        setHistory(historyData.battles || [])
        if (metaData.skills?.length) {
          setSettings((current) => ({
            ...current,
            skillId: current.skillId || metaData.skills[0].id,
          }))
        }
      } catch (err) {
        setError(err.message || 'Unable to load arena')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (queueStatus.status !== 'SEARCHING') {
      clearInterval(pollRef.current)
      clearInterval(elapsedRef.current)
      searchStartRef.current = null
      return undefined
    }

    if (!searchStartRef.current) {
      searchStartRef.current = Date.now()
    }

    elapsedRef.current = setInterval(() => {
      if (searchStartRef.current) {
        setSearchElapsed(Math.floor((Date.now() - searchStartRef.current) / 1000))
      }
    }, 1000)

    pollRef.current = setInterval(async () => {
      try {
        const status = await battleApi.queueStatus()
        setQueueStatus((current) =>
          current.status === status.status && current.battleId === status.battleId
            ? current
            : status,
        )
        if (status.status === 'MATCHED' && status.battleId) {
          clearInterval(pollRef.current)
          navigate(ROUTES.getBattlePath(status.battleId))
        }
        if (status.status === 'NO_MATCH') {
          clearInterval(pollRef.current)
        }
      } catch {
        /* ignore */
      }
    }, 3000)

    return () => {
      clearInterval(pollRef.current)
      clearInterval(elapsedRef.current)
    }
  }, [queueStatus.status, navigate])

  const handleFindMatch = async () => {
    setError('')
    setSearchElapsed(0)
    searchStartRef.current = Date.now()
    try {
      const status = await battleApi.joinQueue(settings)
      setQueueStatus(status)
      if (status.status === 'MATCHED' && status.battleId) {
        navigate(ROUTES.getBattlePath(status.battleId))
      }
    } catch (err) {
      setError(err.message || 'Could not enter matchmaking')
    }
  }

  const handleCancelSearch = useCallback(async () => {
    await battleApi.leaveQueue()
    setQueueStatus({ status: 'IDLE' })
    setSearchElapsed(0)
  }, [])

  const handleCreateRoom = async () => {
    setError('')
    try {
      const data = await battleApi.createFriendBattle(settings)
      navigate(ROUTES.getBattlePath(data.battleId))
    } catch (err) {
      setError(err.message || 'Could not create battle room')
    }
  }

  const handleJoinRoom = async () => {
    setError('')
    try {
      const data = await battleApi.joinFriendBattle({ battleCode: friendCode })
      navigate(ROUTES.getBattlePath(data.battleId))
    } catch (err) {
      setError(err.message || 'Could not join battle room')
    }
  }

  if (loading) {
    return (
      <div className="arena-page arena-page--boot">
        <div className="arena-boot">
          <div className="arena-boot-emblem" aria-hidden="true">
            VS
          </div>
          <p className="arena-boot-text">Entering arena…</p>
          <div className="arena-boot-bar">
            <span className="arena-boot-bar-fill" />
          </div>
        </div>
      </div>
    )
  }

  const searching = queueStatus.status === 'SEARCHING'
  const noMatch = queueStatus.status === 'NO_MATCH'
  const selectedSkill = meta?.skills?.find((skill) => skill.id === settings.skillId)

  return (
    <div className="arena-page">
      {searching ? (
        <MatchmakingOverlay
          settings={settings}
          meta={meta}
          elapsed={searchElapsed}
          onCancel={handleCancelSearch}
        />
      ) : null}

      {!searching ? (
        <>
      <div className="arena-bg" aria-hidden="true">
        <span className="arena-bg-glow arena-bg-glow--left" />
        <span className="arena-bg-glow arena-bg-glow--right" />
        <span className="arena-bg-grid" />
      </div>

      <header className="arena-header">
        <div className="arena-header-copy">
          <p className="arena-kicker">Skill Arena · Ranked</p>
          <h1 className="arena-title">Battle Lobby</h1>
          <p className="arena-subtitle">
            Pick your format, lock your loadout, and queue for a fair match. Same questions. Same
            timer. Winner takes the arena.
          </p>
        </div>
        <div className="arena-header-badge" aria-hidden="true">
          <span className="arena-header-badge-icon">⚔</span>
          <span>Live</span>
        </div>
      </header>

      {error ? <p className="arena-error">{error}</p> : null}

      {noMatch ? (
        <div className="arena-no-match">
          <p className="arena-no-match-title">No opponents found</p>
          <p className="arena-no-match-copy">
            Nobody is queued for {selectedSkill?.name || 'this skill'} at {settings.difficulty}{' '}
            {settings.format === 'THREE_V_THREE' ? '3v3' : '1v1'}. Try a different skill,
            difficulty, or invite friends.
          </p>
          <button type="button" className="arena-btn arena-btn--primary" onClick={() => setQueueStatus({ status: 'IDLE' })}>
            Back to lobby
          </button>
        </div>
      ) : null}

      <div className="arena-mode-switch">
        <button
          type="button"
          className={`arena-mode-tab${playMode === 'ranked' ? ' is-active' : ''}`}
          onClick={() => setPlayMode('ranked')}
        >
          Ranked queue
        </button>
        <button
          type="button"
          className={`arena-mode-tab${playMode === 'friends' ? ' is-active' : ''}`}
          onClick={() => setPlayMode('friends')}
        >
          Play with friends
        </button>
      </div>

      <div className="arena-layout">
        <section className="arena-panel arena-panel--config">
          <div className="arena-section">
            <h2 className="arena-section-title">Select format</h2>
            <div className="arena-format-grid">
              {FORMAT_OPTIONS.map((format) => (
                <button
                  key={format.id}
                  type="button"
                  className={`arena-format-card${settings.format === format.id ? ' is-selected' : ''}`}
                  onClick={() => setSettings((current) => ({ ...current, format: format.id }))}
                  disabled={searching}
                >
                  <span className="arena-format-icon">{format.id === 'ONE_V_ONE' ? '1v1' : '3v3'}</span>
                  <strong>{format.label}</strong>
                  <span>{format.tagline}</span>
                  <span className="arena-format-slots">{format.slots} players</span>
                </button>
              ))}
            </div>
          </div>

          <div className="arena-section">
            <h2 className="arena-section-title">Battle mode</h2>
            <div className="arena-mode-grid">
              {MODE_OPTIONS.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={`arena-mode-card${settings.mode === mode.id ? ' is-selected' : ''}`}
                  onClick={() => setSettings((current) => ({ ...current, mode: mode.id }))}
                  disabled={searching}
                >
                  <span className="arena-mode-icon">{mode.icon}</span>
                  <strong>{mode.label}</strong>
                  <span>{mode.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="arena-section arena-section--row">
            <div className="arena-field-block">
              <h2 className="arena-section-title">Skill track</h2>
              <select
                className="arena-select"
                value={settings.skillId}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, skillId: event.target.value }))
                }
                disabled={searching}
              >
                {(meta?.skills || []).map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name} · {skill.category}
                  </option>
                ))}
              </select>
            </div>

            <div className="arena-field-block">
              <h2 className="arena-section-title">Difficulty tier</h2>
              <div className="arena-difficulty-row">
                {DIFFICULTY_OPTIONS.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    className={`arena-difficulty${settings.difficulty === level.id ? ' is-selected' : ''} arena-difficulty--${level.tier}`}
                    onClick={() =>
                      setSettings((current) => ({ ...current, difficulty: level.id }))
                    }
                    disabled={searching}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {playMode === 'ranked' ? (
            <button
              type="button"
              className="arena-btn arena-btn--queue"
              disabled={searching || !settings.skillId}
              onClick={handleFindMatch}
            >
              <span className="arena-btn-shine" aria-hidden="true" />
              Enter matchmaking
            </button>
          ) : (
            <div className="arena-friends-actions">
              <button
                type="button"
                className="arena-btn arena-btn--queue"
                disabled={searching || !settings.skillId}
                onClick={handleCreateRoom}
              >
                Create room
              </button>
              <div className="arena-join-row">
                <input
                  className="arena-code-input"
                  type="text"
                  placeholder="ROOM CODE"
                  value={friendCode}
                  onChange={(event) => setFriendCode(event.target.value.toUpperCase())}
                  maxLength={8}
                />
                <button type="button" className="arena-btn arena-btn--secondary" onClick={handleJoinRoom}>
                  Join
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="arena-panel arena-panel--preview">
          <div className="arena-preview-head">
            <h2>Match preview</h2>
            <span className="arena-preview-live">Queue ready</span>
          </div>

          <ArenaRoster format={settings.format} searching={false} />

          <dl className="arena-loadout">
            <div>
              <dt>Format</dt>
              <dd>{settings.format === 'THREE_V_THREE' ? '3v3 Squad' : '1v1 Duel'}</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>{settings.mode === 'CODING' ? 'Coding' : 'Quiz'}</dd>
            </div>
            <div>
              <dt>Skill</dt>
              <dd>{selectedSkill?.name || '—'}</dd>
            </div>
            <div>
              <dt>Tier</dt>
              <dd>{settings.difficulty}</dd>
            </div>
          </dl>

          <ul className="arena-rules">
            <li>Matched players share identical AI-generated questions.</li>
            <li>Global timer starts for everyone at once.</li>
            <li>Highest score wins — accuracy breaks ties, then fastest time.</li>
          </ul>

          {history.length ? (
            <div className="arena-history">
              <h3>Recent battles</h3>
              <ul>
                {history.slice(0, 4).map((entry) => (
                  <li key={entry.id}>
                    <span>
                      {entry.format === 'THREE_V_THREE' ? '3v3' : '1v1'} · {entry.skill}
                    </span>
                    <span className={`arena-history-status arena-history-status--${entry.status?.toLowerCase()}`}>
                      {entry.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
        </>
      ) : null}
    </div>
  )
}

export default BattlesAppPage
