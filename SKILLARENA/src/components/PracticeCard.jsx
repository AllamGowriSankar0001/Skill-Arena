import { Link } from 'react-router-dom'
import { ROUTES } from '../routes'
import { getPracticeModeMeta } from '../utils/practiceMode'

const formatLabel = (value = '') =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const PracticeCard = ({
  assessment,
  showDesktopBadge = false,
  asLink = true,
}) => {
  const modeMeta = getPracticeModeMeta(assessment)

  const body = (
    <>
      <div className="practice-card-top">
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
      <div className="practice-card-heading">
        <div className="practice-card-icon" aria-hidden="true">
          {modeMeta.icon}
        </div>
        <h2>{assessment.title}</h2>
      </div>
      {assessment.description ? <p>{assessment.description}</p> : null}
      <div className="practice-card-meta">
        <span>{modeMeta.label}</span>
        {showDesktopBadge ? (
          <span className="practice-badge practice-badge--desktop">Laptop / tablet</span>
        ) : null}
        <span>
          {assessment.questionCount || 0} question
          {(assessment.questionCount || 0) === 1 ? '' : 's'}
        </span>
        {assessment.xpReward ? <span>{assessment.xpReward} XP</span> : null}
      </div>
      <div className="practice-card-foot">
        {assessment.passed ? (
          <span className="practice-status practice-status--passed">
            Passed · Best {assessment.bestScore}%
          </span>
        ) : assessment.bestScore != null ? (
          <span className="practice-status">Best score {assessment.bestScore}%</span>
        ) : (
          <span className="practice-status practice-status--new">Not started</span>
        )}
        <span className="practice-card-cta">Start practice →</span>
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
