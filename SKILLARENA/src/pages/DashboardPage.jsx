import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CourseThumbnail from '../components/CourseThumbnail'
import { useAuth } from '../context/AuthContext'
import { homeApi } from '../services/api'
import { ROUTES } from '../routes'
import { getResumeProfileCompletion } from '../utils/userProfile'
import { formatXpLabel } from '../utils/xpSync'
import './DashboardPage.css'

const QUICK_LINKS = [
  { label: 'Browse courses', to: ROUTES.learn, description: 'Structured learning paths' },
  { label: 'Practice', to: ROUTES.practice, description: 'Quizzes and coding drills' },
  { label: 'Resume builder', to: ROUTES.resume, description: 'AI-tailored PDF resume' },
  { label: 'Leaderboard', to: ROUTES.leaderboard, description: 'Weekly XP rankings' },
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

  const totalXp = stats?.totalXp ?? user?.xp ?? 0
  const level = stats?.level ?? user?.level ?? 1
  const levelProgress = stats
    ? Math.min(100, Math.round((stats.currentLevelXp / Math.max(stats.nextLevelXp, 1)) * 100))
    : user?.currentLevelXp != null && user?.nextLevelXp
      ? Math.min(100, Math.round((user.currentLevelXp / Math.max(user.nextLevelXp, 1)) * 100))
      : 0

  const continueLearning = home?.continueLearning
  const continueLessonId = continueLearning?.currentLesson?.id
  const continueHref = continueLearning?.course?.id
    ? continueLessonId
      ? `${ROUTES.learn}/${continueLearning.course.id}/lessons/${continueLessonId}`
      : `${ROUTES.learn}/${continueLearning.course.id}`
    : ROUTES.learn

  const recommendedCourses = home?.recommendedCourses || []
  const leaderboard = home?.weeklyLeaderboard

  return (
    <main className="dashboard">
      <div className="dashboard-inner">
        <header className="dashboard-topbar">
          <div>
            <p className="dashboard-kicker">Dashboard</p>
            <h1 className="dashboard-title">Welcome back, {firstName}</h1>
            <p className="dashboard-subtitle">
              Pick up where you left off, track your progress, and keep building skills.
            </p>
          </div>
          {showGamification ? (
            <div className="dashboard-topbar-stats" aria-label="Your level and XP">
              <span className="dashboard-level-pill">Level {level}</span>
              <span className="dashboard-xp-pill">{formatXpLabel(totalXp)}</span>
            </div>
          ) : null}
        </header>

        {error ? <p className="dashboard-alert dashboard-alert--error">{error}</p> : null}
        {loading ? <p className="dashboard-alert">Loading your dashboard…</p> : null}

        {!loading ? (
          <div className="dashboard-layout">
            <div className="dashboard-main">
              {showGamification ? (
                <section className="dashboard-continue" aria-labelledby="dashboard-continue-title">
                  <div className="dashboard-continue-copy">
                    <p className="dashboard-kicker">Continue learning</p>
                    <h2 id="dashboard-continue-title">
                      {continueLearning?.course?.title || 'Start your next course'}
                    </h2>
                    {continueLearning?.currentLesson?.title ? (
                      <p className="dashboard-continue-lesson">{continueLearning.currentLesson.title}</p>
                    ) : (
                      <p className="dashboard-continue-lesson">
                        Explore published courses and begin your learning path.
                      </p>
                    )}
                    {continueLearning?.progressPercentage != null ? (
                      <div className="dashboard-continue-progress">
                        <div className="dashboard-continue-progress-meta">
                          <span>Course progress</span>
                          <strong>{continueLearning.progressPercentage}%</strong>
                        </div>
                        <div
                          className="dashboard-progress-track"
                          role="progressbar"
                          aria-valuenow={continueLearning.progressPercentage}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <span style={{ width: `${continueLearning.progressPercentage}%` }} />
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <Link to={continueHref} className="dashboard-btn dashboard-btn--primary">
                    {continueLearning ? 'Continue course' : 'Browse courses'}
                  </Link>
                </section>
              ) : null}

              {showGamification ? (
                <section className="dashboard-metrics" aria-label="Learning stats">
                  <article className="dashboard-metric">
                    <span className="dashboard-metric-label">Total XP</span>
                    <strong>{totalXp.toLocaleString()}</strong>
                  </article>
                  <article className="dashboard-metric">
                    <span className="dashboard-metric-label">Lessons done</span>
                    <strong>{stats?.lessonsCompleted ?? 0}</strong>
                  </article>
                  <article className="dashboard-metric">
                    <span className="dashboard-metric-label">Courses done</span>
                    <strong>{stats?.coursesCompleted ?? 0}</strong>
                  </article>
                  <article className="dashboard-metric">
                    <span className="dashboard-metric-label">Streak</span>
                    <strong>{stats?.currentStreak ?? 0} days</strong>
                  </article>
                </section>
              ) : null}

              {recommendedCourses.length ? (
                <section className="dashboard-panel" aria-labelledby="dashboard-courses-title">
                  <div className="dashboard-panel-head">
                    <div>
                      <h2 id="dashboard-courses-title">Recommended for you</h2>
                      <p>Popular and skill-matched courses to explore next.</p>
                    </div>
                    <Link to={ROUTES.learn} className="dashboard-panel-link">
                      View all
                    </Link>
                  </div>
                  <div className="dashboard-course-grid">
                    {recommendedCourses.map((course) => (
                      <Link
                        key={course.id}
                        to={`${ROUTES.learn}/${course.id}`}
                        className="dashboard-course-card"
                      >
                        <div className="dashboard-course-thumb">
                          <CourseThumbnail
                            src={course.thumbnailUrl}
                            alt=""
                            placeholderLabel={course.title?.slice(0, 1) || 'C'}
                          />
                        </div>
                        <div className="dashboard-course-copy">
                          <strong>{course.title}</strong>
                          <span>
                            {course.lessonCount ? `${course.lessonCount} lessons` : 'Course'}
                            {course.estimatedMinutes ? ` · ${course.estimatedMinutes} min` : ''}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="dashboard-panel" aria-labelledby="dashboard-quick-title">
                <div className="dashboard-panel-head">
                  <div>
                    <h2 id="dashboard-quick-title">Quick access</h2>
                    <p>Jump straight into the areas you use most.</p>
                  </div>
                </div>
                <div className="dashboard-quick-grid">
                  {QUICK_LINKS.map((item) => (
                    <Link key={item.to} to={item.to} className="dashboard-quick-card">
                      <strong>{item.label}</strong>
                      <span>{item.description}</span>
                    </Link>
                  ))}
                </div>
              </section>
            </div>

            <aside className="dashboard-sidebar">
              {showGamification ? (
                <section className="dashboard-side-card">
                  <h2>Level progress</h2>
                  <p className="dashboard-side-lead">
                    Level {level} · {stats?.rank ?? user?.rank ?? 'Bronze'}
                  </p>
                  <div
                    className="dashboard-progress-track dashboard-progress-track--large"
                    role="progressbar"
                    aria-valuenow={levelProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span style={{ width: `${levelProgress}%` }} />
                  </div>
                  <p className="dashboard-side-meta">
                    {stats?.currentLevelXp ?? user?.currentLevelXp ?? 0} /{' '}
                    {stats?.nextLevelXp ?? user?.nextLevelXp ?? 100} XP to next level
                  </p>
                </section>
              ) : null}

              {!profileCompletion.isComplete ? (
                <section className="dashboard-side-card dashboard-side-card--accent">
                  <h2>Complete your profile</h2>
                  <p className="dashboard-side-lead">
                    {profileCompletion.percent}% complete — better profile data improves resume quality.
                  </p>
                  <div className="dashboard-progress-track">
                    <span style={{ width: `${profileCompletion.percent}%` }} />
                  </div>
                  <Link to={ROUTES.profile} className="dashboard-btn dashboard-btn--ghost dashboard-btn--block">
                    Update profile
                  </Link>
                </section>
              ) : null}

              <section className="dashboard-side-card">
                <h2>Resume builder</h2>
                <p className="dashboard-side-lead">
                  Generate an ATS-friendly resume tailored to any job description.
                </p>
                <Link to={ROUTES.resume} className="dashboard-btn dashboard-btn--primary dashboard-btn--block">
                  Open resume builder
                </Link>
              </section>

              {leaderboard?.entries?.length ? (
                <section className="dashboard-side-card">
                  <div className="dashboard-panel-head dashboard-panel-head--compact">
                    <div>
                      <h2>Weekly leaderboard</h2>
                      {leaderboard.yourRank ? (
                        <p>Your rank: #{leaderboard.yourRank}</p>
                      ) : (
                        <p>Top learners this week</p>
                      )}
                    </div>
                  </div>
                  <ol className="dashboard-mini-leaderboard">
                    {leaderboard.entries.map((entry) => (
                      <li key={entry.rank}>
                        <span className="dashboard-mini-rank">#{entry.rank}</span>
                        <span className="dashboard-mini-name">{entry.name}</span>
                        <span className="dashboard-mini-xp">{entry.xp.toLocaleString()}</span>
                      </li>
                    ))}
                  </ol>
                  <Link to={ROUTES.leaderboard} className="dashboard-panel-link dashboard-panel-link--block">
                    View full leaderboard
                  </Link>
                </section>
              ) : null}

              <Link to={ROUTES.profile} className="dashboard-profile-link">
                View profile settings
              </Link>
            </aside>
          </div>
        ) : null}
      </div>
    </main>
  )
}

export default DashboardPage
