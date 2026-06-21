import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { adminApi } from '../../services/api'
import { ROUTES } from '../../routes'
import './AdminDashboardPage.css'

const STAT_ITEMS = [
  {
    key: 'courseCount',
    label: 'Total courses',
    icon: '📚',
    accent: 'courses',
  },
  {
    key: 'publishedCourseCount',
    label: 'Published',
    icon: '✓',
    accent: 'published',
  },
  {
    key: 'practiceCount',
    label: 'Practice sets',
    icon: '🎯',
    accent: 'practice',
  },
  {
    key: 'questionCount',
    label: 'Questions',
    icon: '❓',
    accent: 'questions',
  },
]

const QuickActionIcon = ({ name }) => {
  const icons = {
    courses: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M5 5.5h11.5a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2z" />
        <path d="M8 5.5V4.5a2 2 0 0 1 2-2h9.5a2 2 0 0 1 2 2V16" />
      </svg>
    ),
    practice: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 3.5V6M12 18v2.5M3.5 12H6M18 12h2.5" />
      </svg>
    ),
    blog: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M6 4.5h12a2 2 0 0 1 2 2v13l-4-2.5-4 2.5-4-2.5-4 2.5V6.5a2 2 0 0 1 2-2z" />
        <path d="M9 9h6M9 12.5h6" />
      </svg>
    ),
    users: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M3.5 19.5c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
        <path d="M16 8.5a2.5 2.5 0 1 1 0 5" />
        <path d="M19.5 19.5c0-2.2-1.5-4-3.5-4.5" />
      </svg>
    ),
    resume: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M8 3.5h8l4.5 4.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2z" />
        <path d="M15.5 3.5V8h4.5M9 12.5h6M9 16h4" />
      </svg>
    ),
  }

  return <span className="admin-overview-action-icon">{icons[name]}</span>
}

const QUICK_ACTIONS = [
  {
    title: 'Courses',
    copy: 'Modules, lessons, and publish controls.',
    to: ROUTES.adminCourses,
    label: 'Manage',
    accent: 'courses',
    icon: 'courses',
    statKey: 'courseCount',
    statLabel: 'courses',
  },
  {
    title: 'Practice',
    copy: 'Quizzes, MCQs, and coding challenges.',
    to: ROUTES.adminPractice,
    label: 'Build',
    accent: 'practice',
    icon: 'practice',
    statKey: 'practiceCount',
    statLabel: 'sets',
  },
  {
    title: 'Blog',
    copy: 'Announcements, guides, and updates.',
    to: ROUTES.adminBlog,
    label: 'Write',
    accent: 'blog',
    icon: 'blog',
  },
  {
    title: 'Users',
    copy: 'Roles, account status, and learner activity.',
    to: ROUTES.adminUsers,
    label: 'Manage',
    accent: 'users',
    icon: 'users',
  },
  {
    title: 'Community',
    copy: 'Official channels, rooms, posts, and moderation.',
    to: ROUTES.adminCommunity,
    label: 'Open',
    accent: 'blog',
    icon: 'blog',
  },
  {
    title: 'Resume',
    copy: 'AI builder and saved user resumes.',
    to: ROUTES.adminResume,
    label: 'Open',
    accent: 'resume',
    icon: 'resume',
  },
]

const START_STEPS = [
  'Create a course, add modules, and publish it for students.',
  'Create a practice set and attach questions to it.',
  'Publish a blog post to share updates with the community.',
  'Students will see published content in the app and website.',
]

const AdminDashboardPage = () => {
  const { user } = useAuth()
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi
      .overview()
      .then(setOverview)
      .catch((err) => setError(err.message || 'Failed to load overview'))
      .finally(() => setLoading(false))
  }, [])

  const firstName = user?.name?.split(' ')[0] || 'Admin'
  const publishRate = useMemo(() => {
    if (!overview?.courseCount) return 0
    return Math.round((overview.publishedCourseCount / overview.courseCount) * 100)
  }, [overview])

  return (
    <div className="admin-page admin-overview">
      <header className="admin-overview-header">
        <div>
          <p className="admin-overview-eyebrow">Admin console</p>
          <h1>Welcome back, {firstName}</h1>
          <p className="admin-overview-lead">
            Manage courses, practice content, blog posts, and resume tools from one place.
          </p>
        </div>
        <Link to={ROUTES.adminCourses} className="admin-btn admin-btn--accent admin-overview-cta">
          + New course
        </Link>
      </header>

      {error ? <p className="admin-error admin-overview-alert">{error}</p> : null}
      {loading ? <p className="admin-overview-loading">Loading overview…</p> : null}

      <section className="admin-overview-stats" aria-label="Content stats">
        {STAT_ITEMS.map((item) => (
          <article key={item.key} className={`admin-overview-stat admin-overview-stat--${item.accent}`}>
            <div className="admin-overview-stat-top">
              <span className="admin-overview-stat-icon" aria-hidden="true">
                {item.icon}
              </span>
              <p className="admin-overview-stat-label">{item.label}</p>
            </div>
            <p className="admin-overview-stat-value">
              {loading ? '—' : (overview?.[item.key] ?? 0).toLocaleString()}
            </p>
          </article>
        ))}
      </section>

      <section className="admin-overview-panel admin-overview-panel--highlight">
        <div className="admin-overview-panel-head">
          <div>
            <p className="admin-overview-eyebrow">Publishing health</p>
            <h2>Course publish rate</h2>
          </div>
          <strong className="admin-overview-rate">{loading ? '—' : `${publishRate}%`}</strong>
        </div>
        <div className="admin-overview-rate-track" aria-hidden="true">
          <div className="admin-overview-rate-fill" style={{ width: `${publishRate}%` }} />
        </div>
        <p className="admin-overview-panel-copy">
          {overview?.publishedCourseCount ?? 0} of {overview?.courseCount ?? 0} courses are live for students.
        </p>
      </section>

      <section className="admin-overview-panel admin-overview-panel--actions">
        <div className="admin-overview-actions-head">
          <div>
            <p className="admin-overview-eyebrow">Workspace</p>
            <h2>Quick actions</h2>
          </div>
          <p className="admin-overview-actions-lead">Jump into the tools you use most.</p>
        </div>
        <div className="admin-overview-actions">
          {QUICK_ACTIONS.map((action) => {
            const statValue = action.statKey ? overview?.[action.statKey] : null
            return (
              <Link
                key={action.to}
                to={action.to}
                className={`admin-overview-action admin-overview-action--${action.accent}`}
              >
                <div className="admin-overview-action-top">
                  <QuickActionIcon name={action.icon} />
                  {action.statKey ? (
                    <span className="admin-overview-action-chip">
                      {loading ? '—' : `${(statValue ?? 0).toLocaleString()} ${action.statLabel}`}
                    </span>
                  ) : null}
                </div>
                <div className="admin-overview-action-body">
                  <h3>{action.title}</h3>
                  <p>{action.copy}</p>
                </div>
                <span className="admin-overview-action-cta">
                  {action.label}
                  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M3.5 8h9M8.5 4.5L12 8l-3.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      <div className="admin-overview-grid">
        <section className="admin-overview-panel">
          <p className="admin-overview-eyebrow">Getting started</p>
          <h2>Launch checklist</h2>
          <ol className="admin-overview-steps">
            {START_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="admin-overview-panel">
          <p className="admin-overview-eyebrow">Shortcuts</p>
          <h2>More admin tools</h2>
          <div className="admin-overview-shortcuts">
            <Link to={ROUTES.adminResumes} className="admin-overview-shortcut">
              <span>User resumes</span>
              <strong>Review saved resumes</strong>
            </Link>
            <Link to={ROUTES.home} className="admin-overview-shortcut">
              <span>Public site</span>
              <strong>View marketing homepage</strong>
            </Link>
            <Link to={ROUTES.blog} className="admin-overview-shortcut">
              <span>Public blog</span>
              <strong>View published posts</strong>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export default AdminDashboardPage
