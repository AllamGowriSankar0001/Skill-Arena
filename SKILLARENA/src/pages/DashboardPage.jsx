import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeApi } from '../services/api'
import { ROUTES } from '../routes'
import { getResumeProfileCompletion } from '../utils/userProfile'
import './DashboardPage.css'

const PLATFORM_CARDS = [
  {
    id: 'learn',
    eyebrow: 'Learn',
    title: 'Structured courses',
    copy: 'Browse published courses, modules, and lessons.',
    to: ROUTES.learn,
    available: true,
    cta: 'Browse courses',
    dark: false,
  },
  {
    id: 'practice',
    eyebrow: 'Practice',
    title: 'Sharpen skills',
    copy: 'Quizzes, MCQs, and coding challenges to earn XP.',
    to: ROUTES.practice,
    available: true,
    cta: 'View practice',
    dark: false,
  },
  {
    id: 'battle',
    eyebrow: 'Battle',
    title: 'Compete live',
    copy: '1v1 and team skill battles are on the roadmap.',
    available: false,
    dark: true,
  },
]

const STAT_ITEMS = [
  { key: 'totalXp', label: 'Total XP', icon: '⚡', format: (stats, user) => (stats?.totalXp ?? user?.xp ?? 0).toLocaleString() },
  { key: 'level', label: 'Level', icon: '▲', format: (stats, user) => stats?.level ?? user?.level ?? 1 },
  {
    key: 'streak',
    label: 'Streak',
    icon: '🔥',
    format: (stats) => `${stats?.currentStreak ?? 0} days`,
  },
  { key: 'rank', label: 'Rank', icon: '◆', format: (stats, user) => stats?.rank ?? user?.rank ?? 'Bronze' },
]

const DashboardPage = () => {
  const { user } = useAuth()
  const [home, setHome] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    homeApi
      .get()
      .then(setHome)
      .catch((err) => setError(err.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const firstName = home?.user?.name?.split(' ')[0] || user?.name?.split(' ')[0] || 'there'
  const stats = home?.stats
  const profileCompletion = useMemo(() => getResumeProfileCompletion(user), [user])
  const showGamification = user?.role !== 'ADMIN'

  return (
    <main className="dashboard">
      <div className="dashboard-inner">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">Dashboard</p>
            <h1 className="dashboard-title">Welcome back, {firstName}</h1>
            <p className="dashboard-subtitle">Your arena hub — explore courses, practice sets, and build your resume.</p>
          </div>
          <Link to={ROUTES.profile} className="dashboard-profile-link">
            View profile
          </Link>
        </header>

        <section className="dashboard-feature">
          <div className="dashboard-feature-content">
            <div className="dashboard-feature-head">
              <div>
                <p className="dashboard-card-eyebrow">Featured tool</p>
                <h2>AI Resume Builder</h2>
              </div>
              <span className="dashboard-feature-badge">Available now</span>
            </div>
            <p className="dashboard-card-copy">
              Generate a tailored, ATS-friendly resume from your profile and any job description. Preview and download as PDF.
            </p>
            {!profileCompletion.isComplete ? (
              <div className="dashboard-feature-profile">
                <div className="dashboard-feature-profile-top">
                  <span>Profile {profileCompletion.percent}% complete</span>
                  <Link to={ROUTES.profile}>Fill profile for better resume</Link>
                </div>
                <div className="dashboard-feature-profile-track" aria-hidden="true">
                  <div
                    className="dashboard-feature-profile-fill"
                    style={{ width: `${profileCompletion.percent}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <Link to={ROUTES.resume} className="dashboard-btn dashboard-btn--primary dashboard-feature-cta">
            Open resume builder
          </Link>
        </section>

        {error ? <p className="dashboard-alert dashboard-alert--error">{error}</p> : null}
        {loading ? <p className="dashboard-alert">Loading your arena data…</p> : null}

        {showGamification ? (
          <section className="dashboard-section">
            <div className="dashboard-section-head">
              <h2 className="dashboard-section-title">Your progress</h2>
              <p className="dashboard-section-copy">Track your arena growth at a glance.</p>
            </div>
            <div className="dashboard-stats" aria-label="Your stats">
              {STAT_ITEMS.map((item) => (
                <article key={item.key} className={`dashboard-stat dashboard-stat--${item.key}`}>
                  <div className="dashboard-stat-top">
                    <span className="dashboard-stat-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <p className="dashboard-stat-label">{item.label}</p>
                  </div>
                  <p className="dashboard-stat-value">{item.format(stats, user)}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="dashboard-section">
          <div className="dashboard-section-head">
            <h2 className="dashboard-section-title">Platform areas</h2>
            <p className="dashboard-section-copy">Learn and Practice are live. Battles are still on the way.</p>
          </div>
          <div className="dashboard-quick" aria-label="Platform areas">
            {PLATFORM_CARDS.map((card) => {
              const cardClassName = `dashboard-card${card.available ? ' dashboard-card--available' : ' dashboard-card--soon'}${card.dark ? ' dashboard-card--dark' : ''}`

              const body = (
                <>
                  <span
                    className={`dashboard-status${card.available ? ' dashboard-status--live' : ''}${card.dark ? ' dashboard-status--light' : ''}`}
                  >
                    {card.available ? 'Available' : 'Coming soon'}
                  </span>
                  <div className="dashboard-card-body">
                    <p className="dashboard-card-eyebrow">{card.eyebrow}</p>
                    <h2>{card.title}</h2>
                    <p className="dashboard-card-copy">{card.copy}</p>
                  </div>
                  <div className="dashboard-card-foot">
                    {card.available ? (
                      <span className="dashboard-btn dashboard-btn--ghost">{card.cta}</span>
                    ) : (
                      <span
                        className={`dashboard-btn dashboard-btn--disabled${card.dark ? ' dashboard-btn--disabled-light' : ''}`}
                      >
                        Coming soon
                      </span>
                    )}
                  </div>
                </>
              )

              if (card.available) {
                return (
                  <Link key={card.id} to={card.to} className={cardClassName}>
                    {body}
                  </Link>
                )
              }

              return (
                <article key={card.id} className={cardClassName}>
                  {body}
                </article>
              )
            })}
          </div>
        </section>

        {home?.weeklyLeaderboard?.entries?.length ? (
          <section className="dashboard-card dashboard-card--leaderboard">
            <div className="dashboard-leaderboard-head">
              <div>
                <p className="dashboard-card-eyebrow">This week</p>
                <h2>Leaderboard</h2>
                <p className="dashboard-leaderboard-lead">Top performers climbing the arena this week.</p>
              </div>
              {home.weeklyLeaderboard.yourRank ? (
                <div className="dashboard-leaderboard-you">
                  <span>Your rank</span>
                  <strong>#{home.weeklyLeaderboard.yourRank}</strong>
                </div>
              ) : null}
            </div>

            <div className="dashboard-leaderboard-panel">
              <div className="dashboard-leaderboard-columns" aria-hidden="true">
                <span>Rank</span>
                <span>Player</span>
                <span>XP</span>
              </div>
              <ol className="dashboard-leaderboard">
                {home.weeklyLeaderboard.entries.map((entry) => {
                  const isYou =
                    entry.rank === home.weeklyLeaderboard.yourRank || entry.name === user?.name

                  return (
                    <li
                      key={entry.rank}
                      className={`dashboard-leaderboard-row${isYou ? ' dashboard-leaderboard-row--you' : ''}${entry.rank <= 3 ? ` dashboard-leaderboard-row--top-${entry.rank}` : ''}`}
                    >
                      <span className="dashboard-leaderboard-rank">
                        <span className="dashboard-leaderboard-rank-badge">{entry.rank}</span>
                      </span>
                      <span className="dashboard-leaderboard-name">
                        {entry.name}
                        {isYou ? <span className="dashboard-leaderboard-you-tag">You</span> : null}
                      </span>
                      <span className="dashboard-leaderboard-xp">{entry.xp.toLocaleString()} XP</span>
                    </li>
                  )
                })}
              </ol>
            </div>

            <div className="dashboard-leaderboard-foot">
              <Link to={ROUTES.leaderboard} className="dashboard-btn dashboard-btn--ghost dashboard-leaderboard-link">
                View full leaderboard
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}

export default DashboardPage
