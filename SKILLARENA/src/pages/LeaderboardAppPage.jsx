import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppEmptyState from '../components/AppEmptyState'
import { useAuth } from '../context/AuthContext'
import { learningApi } from '../services/api'
import { ROUTES } from '../routes'
import './LeaderboardPage.css'

const SCOPES = [
  { id: 'global', label: 'Global' },
  { id: 'category', label: 'By category' },
  { id: 'course', label: 'By course' },
]

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

const podiumOrder = (entries) => {
  const top = entries.slice(0, 3)
  if (top.length < 3) return top
  return [top[1], top[0], top[2]]
}

const LeaderboardPicker = ({ label, items, value, onChange, allLabel, placeholder = 'Select…' }) => {
  if (!items.length) return null

  return (
    <label className="leaderboard-picker">
      <span className="leaderboard-picker-label">{label}</span>
      <span className="leaderboard-picker-control">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
        >
          {allLabel ? <option value="">{allLabel}</option> : null}
          {!allLabel && !value ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name || item.title}
            </option>
          ))}
        </select>
      </span>
    </label>
  )
}

const PodiumCube = ({ entry }) => (
  <article
    className={`leaderboard-podium-slot leaderboard-podium-slot--${entry.rank}${entry.isYou ? ' is-you' : ''}`}
  >
    <div className="leaderboard-podium-profile">
      <div className="leaderboard-podium-avatar-wrap">
        <span className="leaderboard-podium-avatar" aria-hidden="true">
          {getInitials(entry.name)}
        </span>
        <span className="leaderboard-podium-medal" aria-label={`Rank ${entry.rank}`}>
          {entry.rank}
        </span>
      </div>
      <strong className="leaderboard-podium-name">{entry.name}</strong>
      <span className="leaderboard-podium-score">{entry.scoreLabel}</span>
      {entry.subtitle ? <small className="leaderboard-podium-level">{entry.subtitle}</small> : null}
    </div>
    <div className="leaderboard-podium-bar" aria-hidden="true">
      <div className="leaderboard-podium-bar-body" />
    </div>
  </article>
)

const LeaderboardAppPage = () => {
  const { user } = useAuth()
  const [scope, setScope] = useState('global')
  const [categoryId, setCategoryId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadLeaderboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await learningApi.leaderboard({
        scope,
        categoryId: scope === 'category' ? categoryId || undefined : undefined,
        courseId: scope === 'course' ? courseId || undefined : undefined,
      })
      setData(payload)
    } catch (err) {
      setError(err.message || 'Failed to load leaderboard')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [scope, categoryId, courseId])

  useEffect(() => {
    loadLeaderboard()
  }, [loadLeaderboard])

  const categories = data?.filters?.categories || []
  const courses = data?.filters?.courses || []

  const coursesForSelectedCategory = useMemo(() => {
    if (!categoryId) return courses
    return courses.filter((course) => course.categoryId === categoryId)
  }, [courses, categoryId])

  const tableEntries = data?.entries || []
  const podiumEntries = podiumOrder(tableEntries)

  const handleScopeChange = (nextScope) => {
    setScope(nextScope)
    const availableCategories = data?.filters?.categories || []
    const availableCourses = data?.filters?.courses || []

    if (nextScope === 'category') {
      setCategoryId((current) => current || availableCategories[0]?.id || '')
    }
    if (nextScope === 'course') {
      setCourseId((current) => current || availableCourses[0]?.id || '')
    }
  }

  return (
    <main className="leaderboard-page">
      <div className="leaderboard-page-inner">
        <header className="leaderboard-header">
          <div>
            <p className="leaderboard-kicker">Leaderboard</p>
            <h1>{data?.title || 'Arena rankings'}</h1>
            <p className="leaderboard-lead">
              {data?.description ||
                'Compare progress globally, within a course category, or on a specific course.'}
            </p>
          </div>
          {data?.yourRank ? (
            <div className="leaderboard-you-card" aria-label="Your current rank">
              <span>Your rank</span>
              <strong>#{data.yourRank}</strong>
              {data.yourEntry ? <small>{data.yourEntry.scoreLabel}</small> : null}
            </div>
          ) : null}
        </header>

        <div className="leaderboard-toolbar">
          <div className="leaderboard-toolbar-row">
            <div className="leaderboard-scope-tabs" role="tablist" aria-label="Leaderboard scope">
              {SCOPES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={scope === item.id}
                  className={`leaderboard-scope-tab${scope === item.id ? ' is-active' : ''}`}
                  onClick={() => handleScopeChange(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {scope === 'category' ? (
              <div className="leaderboard-toolbar-filters">
                <LeaderboardPicker
                  label="Category"
                  items={categories}
                  value={categoryId || data?.selectedCategoryId || ''}
                  onChange={setCategoryId}
                  placeholder="Choose category"
                />
              </div>
            ) : null}

            {scope === 'course' ? (
              <div className="leaderboard-toolbar-filters">
                <LeaderboardPicker
                  label="Category"
                  items={categories}
                  value={categoryId}
                  allLabel="All categories"
                  onChange={(nextCategoryId) => {
                    setCategoryId(nextCategoryId)
                    const nextCourses = nextCategoryId
                      ? courses.filter((course) => course.categoryId === nextCategoryId)
                      : courses
                    setCourseId(nextCourses[0]?.id || '')
                  }}
                />
                <LeaderboardPicker
                  label="Course"
                  items={categoryId ? coursesForSelectedCategory : courses}
                  value={courseId || data?.selectedCourseId || ''}
                  onChange={setCourseId}
                  placeholder="Choose course"
                />
              </div>
            ) : null}
          </div>
        </div>

        {error ? <p className="leaderboard-alert leaderboard-alert--error">{error}</p> : null}
        {loading ? <p className="leaderboard-alert">Loading rankings…</p> : null}

        {!loading && !error && tableEntries.length >= 3 ? (
          <section className="leaderboard-podium" aria-label="Top three learners">
            <div className="leaderboard-podium-grid">
              {podiumEntries.map((entry) => (
                <PodiumCube key={entry.rank} entry={entry} />
              ))}
            </div>
            <div className="leaderboard-podium-floor" aria-hidden="true" />
          </section>
        ) : null}

        {!loading && !error && tableEntries.length ? (
          <section className="leaderboard-table-wrap" aria-label="Leaderboard rankings">
            <div className="leaderboard-table-head">
              <span>Rank</span>
              <span>Learner</span>
              <span>{data?.metricLabel || 'Score'}</span>
              <span>Details</span>
            </div>
            <ol className="leaderboard-table">
              {tableEntries.map((entry) => (
                <li
                  key={`${entry.rank}-${entry.userId}`}
                  className={`leaderboard-row${entry.isYou ? ' is-you' : ''}${entry.rank <= 3 ? ` is-top-${entry.rank}` : ''}`}
                >
                  <span className="leaderboard-row-rank">
                    <span className="leaderboard-rank-badge">{entry.rank}</span>
                  </span>
                  <span className="leaderboard-row-user">
                    <span className="leaderboard-row-avatar" aria-hidden="true">
                      {getInitials(entry.name)}
                    </span>
                    <span className="leaderboard-row-name">
                      {entry.name}
                      {entry.isYou || entry.name === user?.name ? (
                        <span className="leaderboard-you-tag">You</span>
                      ) : null}
                    </span>
                  </span>
                  <span className="leaderboard-row-score">{entry.scoreLabel}</span>
                  <span className="leaderboard-row-subtitle">{entry.subtitle || '—'}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {!loading && !error && !tableEntries.length ? (
          <AppEmptyState
            icon="🏆"
            title="No rankings yet"
            description={
              scope === 'global'
                ? 'Complete lessons and earn XP to appear on the global leaderboard.'
                : scope === 'category'
                  ? 'Start learning courses in this category to climb the rankings.'
                  : 'Enroll in this course and complete lessons to appear here.'
            }
            action={
              <Link to={ROUTES.learn} className="leaderboard-empty-link">
                Browse courses
              </Link>
            }
          />
        ) : null}
      </div>
    </main>
  )
}

export default LeaderboardAppPage
