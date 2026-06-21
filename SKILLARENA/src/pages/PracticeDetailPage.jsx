import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CodingPlayground from '../components/CodingPlayground'
import CodingViewportGate from '../components/CodingViewportGate'
import PracticeQuiz from '../components/PracticeQuiz'
import { useAuth } from '../context/AuthContext'
import { applyXpUpdate } from '../utils/xpSync'
import { learningApi } from '../services/api'
import { ROUTES } from '../routes'
import { getPracticeModeMeta } from '../utils/practiceMode'
import { getCodingGateAction } from '../utils/codingGateAction'
import './PracticeDetailPage.css'

const formatLabel = (value = '') =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const PracticeDetailPage = () => {
  const { assessmentId } = useParams()
  const { updateUser } = useAuth()
  const [practice, setPractice] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [codingPayload, setCodingPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadPractice = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const detail = await learningApi.getPractice(assessmentId)
      setPractice(detail.practice)

      if (detail.practice.sessionType === 'CODING') {
        const payload = await learningApi.getPracticeCoding(assessmentId)
        setCodingPayload(payload)
        setQuiz(null)
      } else {
        const quizPayload = await learningApi.getPracticeQuiz(assessmentId)
        setQuiz(quizPayload.quiz)
        setCodingPayload(null)
      }
    } catch (err) {
      setError(err.message || 'Failed to load practice set')
      setPractice(null)
      setQuiz(null)
      setCodingPayload(null)
    } finally {
      setLoading(false)
    }
  }, [assessmentId])

  useEffect(() => {
    loadPractice()
  }, [loadPractice])

  const handleCompleted = async (response) => {
    applyXpUpdate(response, { updateUser })
    const detail = await learningApi.getPractice(assessmentId)
    setPractice(detail.practice)
  }

  if (loading) {
    return (
      <main className="practice-detail-page">
        <div className="practice-detail-inner">
          <p className="practice-detail-loading">Loading practice set…</p>
        </div>
      </main>
    )
  }

  if (error || !practice) {
    return (
      <main className="practice-detail-page">
        <div className="practice-detail-inner">
          <Link to={ROUTES.practice} className="practice-detail-back">
            ← Back to practice
          </Link>
          <p className="practice-detail-error">{error || 'Practice set not found.'}</p>
        </div>
      </main>
    )
  }

  const modeMeta = getPracticeModeMeta(practice)
  const codingAction = getCodingGateAction({
    passed: practice.passed,
    attemptCount: practice.attemptCount,
  })

  return (
    <main className="practice-detail-page">
      <div className="practice-detail-inner">
        <Link to={ROUTES.practice} className="practice-detail-back">
          ← Back to practice
        </Link>

        <header className="practice-detail-header">
          <div className="practice-detail-heading">
            <p className="practice-detail-eyebrow">Practice</p>
            <div className="practice-detail-title-row">
              <div className="practice-detail-mode-icon" aria-hidden="true">
                {modeMeta.icon}
              </div>
              <h1>{practice.title}</h1>
            </div>
            {practice.description ? <p className="practice-detail-lead">{practice.description}</p> : null}
            {practice.seriesParts?.length > 1 ? (
              <nav className="practice-series-nav" aria-label="Practice series parts">
                {practice.seriesParts.map((part) => (
                  <Link
                    key={part.id}
                    to={ROUTES.getPracticePath(part.id)}
                    className={`practice-series-nav-link${part.id === practice.id ? ' is-active' : ''}`}
                  >
                    Part {part.seriesPart}
                  </Link>
                ))}
              </nav>
            ) : null}
          </div>
          <div className="practice-detail-stats" aria-label="Practice stats">
            {practice.skillName ? (
              <div className="practice-detail-stat">
                <span>Skill</span>
                <strong>{practice.skillName}</strong>
              </div>
            ) : null}
            <div className="practice-detail-stat">
              <span>Difficulty</span>
              <strong>{formatLabel(practice.difficulty)}</strong>
            </div>
            <div className="practice-detail-stat">
              <span>Pass score</span>
              <strong>{practice.passingPercentage}%</strong>
            </div>
            {practice.bestScore != null ? (
              <div className="practice-detail-stat">
                <span>Best score</span>
                <strong>{practice.bestScore}%</strong>
              </div>
            ) : null}
            {practice.xpReward ? (
              <div className="practice-detail-stat practice-detail-stat--xp">
                <span>XP reward</span>
                <strong>{practice.xpReward} XP</strong>
              </div>
            ) : null}
          </div>
        </header>

        <div className="practice-detail-pills">
          <span className="practice-detail-pill">{formatLabel(practice.mode)}</span>
          <span className="practice-detail-pill">
            {practice.questionCount} question{practice.questionCount === 1 ? '' : 's'}
          </span>
          {practice.durationSeconds ? (
            <span className="practice-detail-pill">{Math.round(practice.durationSeconds / 60)} min</span>
          ) : null}
          {practice.attemptsAllowed ? (
            <span className="practice-detail-pill">{practice.attemptsAllowed} attempts max</span>
          ) : null}
          {practice.passed ? <span className="practice-detail-pill practice-detail-pill--passed">Passed</span> : null}
        </div>

        <section className="practice-detail-session">
          {practice.sessionType === 'CODING' && codingPayload ? (
            <CodingViewportGate
              action={codingAction}
              contextLabel="coding practice"
              backTo={ROUTES.practice}
              backLabel="← Back to practice"
            >
              <CodingPlayground
                contextType="practice"
                assessmentId={assessmentId}
                payload={codingPayload}
                onProgressUpdate={handleCompleted}
              />
            </CodingViewportGate>
          ) : null}

          {practice.sessionType === 'QUIZ' && quiz ? (
            <PracticeQuiz
              assessmentId={assessmentId}
              quiz={quiz}
              onCompleted={handleCompleted}
              completionXpReward={practice.xpReward}
            />
          ) : null}
        </section>
      </div>
    </main>
  )
}

export default PracticeDetailPage
