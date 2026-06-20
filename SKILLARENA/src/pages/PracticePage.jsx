import { useEffect, useState } from 'react'
import AppEmptyState from '../components/AppEmptyState'
import { platformApi } from '../services/api'
import './AppSectionPage.css'

const formatLabel = (value = '') =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const PracticePage = () => {
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    platformApi
      .practice()
      .then((data) => setAssessments(data.assessments || []))
      .catch((err) => setError(err.message || 'Failed to load practice sets'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="app-section">
      <div className="app-section-inner">
        <p className="app-section-eyebrow">Practice</p>
        <h1>Sharpen your skills</h1>
        <p className="app-section-lead">
          Work through quizzes, MCQs, and coding challenges to build confidence and earn XP.
        </p>

        {error ? <p className="app-section-error">{error}</p> : null}
        {loading ? <p className="app-section-meta">Loading practice sets…</p> : null}

        {!loading && !error && assessments.length ? (
          <div className="app-section-grid">
            {assessments.map((assessment) => (
              <article key={assessment._id} className="app-section-card">
                <h2>{assessment.title}</h2>
                {assessment.description ? <p>{assessment.description}</p> : null}
                <span className="app-section-card-meta">
                  {formatLabel(assessment.difficulty)}
                  {assessment.mode ? ` • ${formatLabel(assessment.mode)}` : ''}
                  {assessment.xpReward != null ? ` • ${assessment.xpReward} XP` : ''}
                </span>
              </article>
            ))}
          </div>
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
