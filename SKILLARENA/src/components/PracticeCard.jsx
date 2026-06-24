import { Link } from 'react-router-dom'
import { ROUTES } from '../routes'
import { getPracticeModeKey, getPracticeModeMeta } from '../utils/practiceMode'

const formatLabel = (value = '') =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const getCtaLabel = (assessment) => {
  if (assessment.passed) return 'Review practice'
  if (assessment.bestScore != null) return 'Try again'
  return 'Start practice'
}

const PracticeCard = ({
  assessment,
  showDesktopBadge = false,
  asLink = true,
}) => {
  const modeMeta = getPracticeModeMeta(assessment)
  const modeKey = getPracticeModeKey(assessment)
  const questionCount = assessment.questionCount || 0

  const body = (
    <>
      <div className="practice-card-tags">
        {assessment.skillName ? (
          <span className="practice-badge practice-badge--skill">{assessment.skillName}</span>
        ) : null}
        {assessment.seriesPart > 1 ? (
          <span className="practice-badge practice-badge--series">Part {assessment.seriesPart}</span>
        ) : null}
        <span
          className={`practice-badge practice-badge--difficulty practice-badge--${assessment.difficulty?.toLowerCase()}`}
        >
          {formatLabel(assessment.difficulty)}
        </span>
      </div>

      <div className="practice-card-main">
        <div className={`practice-card-icon practice-card-icon--${modeKey}`} aria-hidden="true">
          {modeMeta.icon}
        </div>
        <div className="practice-card-copy">
          <h2>{assessment.title}</h2>
          {assessment.description ? <p>{assessment.description}</p> : null}
        </div>
      </div>

      <div className="practice-card-stats">
        <span className={`practice-stat practice-stat--mode practice-stat--${modeKey}`}>
          {modeMeta.label}
        </span>
        <span className="practice-stat">
          {questionCount} question{questionCount === 1 ? '' : 's'}
        </span>
        {assessment.xpReward ? (
          <span className="practice-stat practice-stat--xp">{assessment.xpReward} XP</span>
        ) : null}
        {showDesktopBadge ? (
          <span className="practice-stat practice-stat--desktop">Laptop / tablet</span>
        ) : null}
      </div>

      <div className="practice-card-foot">
        {assessment.passed ? (
          <span className="practice-status practice-status--passed">
            Passed · Best {assessment.bestScore}%
          </span>
        ) : assessment.bestScore != null ? (
          <span className="practice-status practice-status--progress">
            Best score {assessment.bestScore}%
          </span>
        ) : (
          <span className="practice-status practice-status--new">Not started</span>
        )}
        <span className="practice-card-cta">
          {getCtaLabel(assessment)}
          <span className="practice-card-cta-arrow" aria-hidden="true">
            →
          </span>
        </span>
      </div>
    </>
  )

  if (!asLink) {
    return <article className="practice-card">{body}</article>
  }

  return (
    <Link to={ROUTES.getPracticePath(assessment.id)} className="practice-card">
      {body}
    </Link>
  )
}

export default PracticeCard
