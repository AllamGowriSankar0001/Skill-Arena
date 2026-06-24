import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  { id: 'ONE_V_ONE', label: '1v1 Duel', tagline: 'Head-to-head', slots: 2, teamSize: 1 },
  { id: 'THREE_V_THREE', label: '3v3 Squad', tagline: 'Team battle', slots: 6, teamSize: 3 },
]

const MODE_OPTIONS = [
  { id: 'QUIZ', label: 'Quiz', icon: '⚡', hint: 'MCQ · same questions · shared timer' },
  { id: 'CODING', label: 'Coding', icon: '⌨', hint: 'Live challenge · beat the clock' },
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

const ArenaRoster = memo(({ format, searching, compact = false }) => {
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
    <div className={`arena-roster${compact ? ' arena-roster--compact' : ''}`}>
      <div className="arena-team arena-team--a">
        <p className="arena-team-name">Your team</p>
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
        <p className="arena-team-name">Opponents</p>
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
        <h2 className="arena-match-title">Finding a fair match…</h2>
        <p className="arena-match-timer">{formatElapsed(elapsed)}</p>

        <div className="arena-match-tags">
          <span>{format?.label}</span>
          <span>{mode?.label}</span>
          <span>{skill?.name || 'Skill'}</span>
          <span>{settings.difficulty}</span>
        </div>

        <ArenaRoster format={settings.format} searching compact />

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

  const selectedSkill = meta?.skills?.find((skill) => skill.id === settings.skillId)
  const selectedFormat = FORMAT_OPTIONS.find((item) => item.id === settings.format)
  const selectedMode = MODE_OPTIONS.find((item) => item.id === settings.mode)

  const loadoutSummary = useMemo(
    () => [
      { label: 'Format', value: selectedFormat?.label || '—' },
      { label: 'Mode', value: selectedMode?.label || '—' },
      { label: 'Skill', value: selectedSkill?.name || '—' },
      { label: 'Tier', value: settings.difficulty },
    ],
    [selectedFormat, selectedMode, selectedSkill, settings.difficulty],
  )

  if (loading) {
    return (
      <div className="arena-page arena-page--boot">
        <div className="arena-boot">
          <div className="arena-boot-emblem" aria-hidden="true">
            VS
          </div>
          <p className="arena-boot-text">Loading battle arena…</p>
        </div>
      </div>
    )
  }

  const searching = queueStatus.status === 'SEARCHING'
  const noMatch = queueStatus.status === 'NO_MATCH'

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

      <div className="arena-page-inner">
        <header className="arena-header">
          <div className="arena-header-copy">
            <p className="arena-kicker">Battles</p>
            <h1 className="arena-title">Arena lobby</h1>
            <p className="arena-subtitle">
              Queue for ranked matches or invite friends. Same questions, shared timer — highest
              score wins.
            </p>
          </div>
          <div className="arena-header-pills">
            <span className="arena-pill arena-pill--live">Live matchmaking</span>
            {history.length ? (
              <span className="arena-pill">{history.length} recent battle{history.length === 1 ? '' : 's'}</span>
            ) : null}
          </div>
        </header>

        {error ? <p className="arena-error" role="alert">{error}</p> : null}

        {noMatch ? (
          <div className="arena-no-match">
            <p className="arena-no-match-title">No opponents found</p>
            <p className="arena-no-match-copy">
              Nobody is queued for {selectedSkill?.name || 'this skill'} at {settings.difficulty}{' '}
              {settings.format === 'THREE_V_THREE' ? '3v3' : '1v1'}. Try another skill, difficulty,
              or invite friends.
            </p>
            <button
              type="button"
              className="arena-btn arena-btn--primary"
              onClick={() => setQueueStatus({ status: 'IDLE' })}
            >
              Back to lobby
            </button>
          </div>
        ) : null}

        <div className="arena-mode-switch" role="tablist" aria-label="Play mode">
          <button
            type="button"
            role="tab"
            aria-selected={playMode === 'ranked'}
            className={`arena-mode-tab${playMode === 'ranked' ? ' is-active' : ''}`}
            onClick={() => setPlayMode('ranked')}
          >
            <span className="arena-mode-tab-text arena-mode-tab-text--long">Ranked queue</span>
            <span className="arena-mode-tab-text arena-mode-tab-text--short">Ranked</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={playMode === 'friends'}
            className={`arena-mode-tab${playMode === 'friends' ? ' is-active' : ''}`}
            onClick={() => setPlayMode('friends')}
          >
            <span className="arena-mode-tab-text arena-mode-tab-text--long">Play with friends</span>
            <span className="arena-mode-tab-text arena-mode-tab-text--short">Friends</span>
          </button>
        </div>

        <div className="arena-layout">
          <section className="arena-panel arena-panel--config">
            <div className="arena-section">
              <div className="arena-section-head">
                <span className="arena-section-step">1</span>
                <h2 className="arena-section-title">Choose format</h2>
              </div>
              <div className="arena-format-grid">
                {FORMAT_OPTIONS.map((format) => (
                  <button
                    key={format.id}
                    type="button"
                    className={`arena-choice-card${settings.format === format.id ? ' is-selected' : ''}`}
                    onClick={() => setSettings((current) => ({ ...current, format: format.id }))}
                    disabled={searching}
                  >
                    <span className="arena-choice-badge">
                      {format.id === 'ONE_V_ONE' ? '1v1' : '3v3'}
                    </span>
                    <strong>{format.label}</strong>
                    <span>{format.tagline}</span>
                    <span className="arena-choice-meta">{format.slots} players</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="arena-section">
              <div className="arena-section-head">
                <span className="arena-section-step">2</span>
                <h2 className="arena-section-title">Battle mode</h2>
              </div>
              <div className="arena-mode-grid">
                {MODE_OPTIONS.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    className={`arena-choice-card arena-choice-card--mode${
                      settings.mode === mode.id ? ' is-selected' : ''
                    }`}
                    onClick={() => setSettings((current) => ({ ...current, mode: mode.id }))}
                    disabled={searching}
                  >
                    <span className="arena-choice-icon" aria-hidden="true">
                      {mode.icon}
                    </span>
                    <strong>{mode.label}</strong>
                    <span>{mode.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="arena-section arena-section--filters">
              <div className="arena-section-head">
                <span className="arena-section-step">3</span>
                <h2 className="arena-section-title">Match settings</h2>
              </div>
              <div className="arena-settings-card">
                <label className="arena-settings-field">
                  <span className="arena-settings-label">Skill track</span>
                  <div className="arena-select-wrap">
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
                </label>

                <div className="arena-settings-field">
                  <span className="arena-settings-label" id="arena-difficulty-label">
                    Difficulty
                  </span>
                  <div
                    className="arena-difficulty-row"
                    role="group"
                    aria-labelledby="arena-difficulty-label"
                  >
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
            </div>

            <div className="arena-section arena-section--action">
              {playMode === 'ranked' ? (
                <>
                  <p className="arena-action-lead">
                    You&apos;ll be matched with players on the same skill, mode, and difficulty.
                  </p>
                  <button
                    type="button"
                    className="arena-btn arena-btn--queue"
                    disabled={searching || !settings.skillId}
                    onClick={handleFindMatch}
                  >
                    Enter matchmaking
                  </button>
                </>
              ) : (
                <div className="arena-friends-actions">
                  <div className="arena-friends-block arena-friends-block--create">
                    <h3>Host a room</h3>
                    <p className="arena-friends-lead">
                      Create a private battle and share the room code with friends.
                    </p>
                    <button
                      type="button"
                      className="arena-btn arena-btn--queue"
                      disabled={searching || !settings.skillId}
                      onClick={handleCreateRoom}
                    >
                      Create room
                    </button>
                  </div>

                  <div className="arena-friends-divider" aria-hidden="true">
                    <span>or</span>
                  </div>

                  <div className="arena-friends-block arena-friends-block--join">
                    <h3>Join a room</h3>
                    <label className="arena-friends-label" htmlFor="arena-friend-code">
                      Room code
                    </label>
                    <div className="arena-join-row">
                      <input
                        id="arena-friend-code"
                        className="arena-code-input"
                        type="text"
                        inputMode="text"
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        placeholder="ABCD1234"
                        value={friendCode}
                        onChange={(event) => setFriendCode(event.target.value.toUpperCase())}
                        maxLength={8}
                      />
                      <button
                        type="button"
                        className="arena-btn arena-btn--secondary arena-btn--join"
                        disabled={!friendCode.trim()}
                        onClick={handleJoinRoom}
                      >
                        Join
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className="arena-panel arena-panel--preview">
            <div className="arena-preview-head">
              <h2>Match preview</h2>
              <span className="arena-preview-live">Ready</span>
            </div>

            <ArenaRoster format={settings.format} searching={false} compact />

            <dl className="arena-loadout">
              {loadoutSummary.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>

            <ul className="arena-rules">
              <li>Identical AI-generated questions for every player</li>
              <li>Shared countdown and timer</li>
              <li>Score wins · accuracy breaks ties · fastest time decides draws</li>
            </ul>

            {history.length ? (
              <div className="arena-history">
                <h3>Recent battles</h3>
                <ul>
                  {history.slice(0, 5).map((entry) => (
                    <li key={entry.id}>
                      <span>
                        {entry.format === 'THREE_V_THREE' ? '3v3' : '1v1'} · {entry.skill} ·{' '}
                        {entry.mode === 'CODING' ? 'Coding' : 'Quiz'}
                      </span>
                      <span
                        className={`arena-history-status arena-history-status--${entry.status?.toLowerCase()}`}
                      >
                        {entry.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  )
}

export default BattlesAppPage
