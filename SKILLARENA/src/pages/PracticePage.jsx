import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppEmptyState from '../components/AppEmptyState'
import { learningApi } from '../services/api'
import { ROUTES } from '../routes'
import { getPracticeModeMeta } from '../utils/practiceMode'
import './PracticePage.css'

const formatLabel = (value = '') =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const PracticeCardSkeleton = () => (
  <div className="practice-card practice-card--skeleton" aria-hidden="true">
    <div className="practice-card-top">
      <div className="practice-skeleton-line practice-skeleton-line--badge" />
      <div className="practice-skeleton-line practice-skeleton-line--badge" />
    </div>
    <div className="practice-skeleton-line practice-skeleton-line--title" />
    <div className="practice-skeleton-line practice-skeleton-line--copy" />
    <div className="practice-skeleton-line practice-skeleton-line--meta" />
  </div>
)

const PracticePage = () => {
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [skillFilter, setSkillFilter] = useState('all')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [modeFilter, setModeFilter] = useState('all')

  useEffect(() => {
    learningApi
      .listPractice()
      .then((data) => setAssessments(data.assessments || []))
      .catch((err) => setError(err.message || 'Failed to load practice sets'))
      .finally(() => setLoading(false))
  }, [])

  const skills = useMemo(() => {
    const map = new Map()
    assessments.forEach((item) => {
      if (item.skillId && item.skillName) {
        map.set(item.skillId, item.skillName)
      }
    })
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [assessments])

  const filteredAssessments = useMemo(
    () =>
      assessments.filter((item) => {
        if (skillFilter !== 'all' && item.skillId !== skillFilter) return false
        if (difficultyFilter !== 'all' && item.difficulty !== difficultyFilter) return false
        if (modeFilter !== 'all' && item.mode !== modeFilter) return false
        return true
      }),
    [assessments, skillFilter, difficultyFilter, modeFilter],
  )

  return (
    <main className="practice-page">
      <div className="practice-page-inner">
        <header className="practice-page-header">
          <p className="practice-eyebrow">Practice</p>
          <h1>Drills, quizzes & coding challenges</h1>
          <p className="practice-lead">
            Sharpen skills with industry-style MCQ sets and hands-on coding exercises. Track your
            best scores and earn XP when you pass.
          </p>
          {!loading && assessments.length ? (
            <p className="practice-count">
              {assessments.length} practice set{assessments.length === 1 ? '' : 's'} available
            </p>
          ) : null}
        </header>

        {!loading && assessments.length ? (
          <div className="practice-toolbar">
            <div className="practice-filters" role="group" aria-label="Filter practice sets">
              <label className="practice-filter">
                <span>Skill</span>
                <select value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)}>
                  <option value="all">All skills</option>
                  {skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="practice-filter">
                <span>Difficulty</span>
                <select
                  value={difficultyFilter}
                  onChange={(event) => setDifficultyFilter(event.target.value)}
                >
                  <option value="all">All levels</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                  <option value="MIXED">Mixed</option>
                </select>
              </label>
              <label className="practice-filter">
                <span>Type</span>
                <select value={modeFilter} onChange={(event) => setModeFilter(event.target.value)}>
                  <option value="all">All types</option>
                  <option value="QUIZ">MCQ Quiz</option>
                  <option value="CODING">Coding</option>
                  <option value="MIXED">Mixed</option>
                </select>
              </label>
            </div>
          </div>
        ) : null}

        {error ? <p className="practice-alert practice-alert--error">{error}</p> : null}

        {loading ? (
          <div className="practice-grid" aria-busy="true" aria-label="Loading practice sets">
            {Array.from({ length: 6 }).map((_, index) => (
              <PracticeCardSkeleton key={index} />
            ))}
          </div>
        ) : null}

        {!loading && !error && filteredAssessments.length ? (
          <div className="practice-grid">
            {filteredAssessments.map((assessment) => {
              const modeMeta = getPracticeModeMeta(assessment)
              return (
                <Link
                  key={assessment.id}
                  to={ROUTES.getPracticePath(assessment.id)}
                  className="practice-card"
                >
                  <div className="practice-card-top">
                    {assessment.skillName ? (
                      <span className="practice-badge practice-badge--skill">{assessment.skillName}</span>
                    ) : null}
                    {assessment.seriesPart > 1 ? (
                      <span className="practice-badge practice-badge--series">Part {assessment.seriesPart}</span>
                    ) : null}
                    <span className={`practice-badge practice-badge--difficulty practice-badge--${assessment.difficulty?.toLowerCase()}`}>
                      {formatLabel(assessment.difficulty)}
                    </span>
                  </div>
                  <div className="practice-card-heading">
                    <div className="practice-card-icon" aria-hidden="true">
                      {modeMeta.icon}
                    </div>
                    <h2>{assessment.title}</h2>
                  </div>
                  {assessment.description ? <p>{assessment.description}</p> : null}
                  <div className="practice-card-meta">
                    <span>{modeMeta.label}</span>
                    <span>{assessment.questionCount || 0} question{(assessment.questionCount || 0) === 1 ? '' : 's'}</span>
                    {assessment.xpReward ? <span>{assessment.xpReward} XP</span> : null}
                  </div>
                  <div className="practice-card-foot">
                    {assessment.passed ? (
                      <span className="practice-status practice-status--passed">Passed · Best {assessment.bestScore}%</span>
                    ) : assessment.bestScore != null ? (
                      <span className="practice-status">Best score {assessment.bestScore}%</span>
                    ) : (
                      <span className="practice-status practice-status--new">Not started</span>
                    )}
                    <span className="practice-card-cta">Start practice →</span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : null}

        {!loading && !error && assessments.length && !filteredAssessments.length ? (
          <AppEmptyState
            icon="🔍"
            title="No matches"
            description="Try changing your filters to see more practice sets."
          />
        ) : null}

        {!loading && !error && !assessments.length ? (
          <AppEmptyState
            icon="🎯"
            title="No practice available"
            description="There are no published practice sets yet. New drills and challenges will appear here when they are ready."
          />
        ) : null}
      </div>
    </main>
  )
}

export default PracticePage
