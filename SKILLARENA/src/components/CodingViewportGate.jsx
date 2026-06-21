import { Link } from 'react-router-dom'
import { useCodingViewportAllowed } from '../hooks/useCodingViewportAllowed'
import './CodingViewportGate.css'

const ACTION_COPY = {
  start: 'start',
  continue: 'continue',
  complete: 'complete',
  review: 'review',
}

const CodingViewportGate = ({
  children,
  action = 'start',
  contextLabel = 'coding practice',
  backTo,
  backLabel = 'Back',
}) => {
  const allowed = useCodingViewportAllowed()
  const verb = ACTION_COPY[action] || ACTION_COPY.start

  if (allowed) {
    return children
  }

  return (
    <div className="coding-viewport-gate" role="region" aria-labelledby="coding-viewport-gate-title">
      <div className="coding-viewport-gate-icon" aria-hidden="true">
        <svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="8" width="56" height="34" rx="4" stroke="currentColor" strokeWidth="2.5" />
          <path d="M20 42h24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M28 42v3h8v-3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="10" y="13" width="44" height="24" rx="2" fill="currentColor" opacity="0.12" />
        </svg>
      </div>
      <p className="coding-viewport-gate-kicker">Desktop or tablet required</p>
      <h2 id="coding-viewport-gate-title" className="coding-viewport-gate-title">
        Open a laptop or tablet to {verb} this {contextLabel}
      </h2>
      <p className="coding-viewport-gate-copy">
        Coding challenges need a wider screen for the editor, preview, and test panel. Mobile
        devices are not supported for attempting {contextLabel}s — switch to a laptop or tablet to{' '}
        {verb}.
      </p>
      <ul className="coding-viewport-gate-list">
        <li>Minimum width: tablet (768px) or larger</li>
        <li>Quiz practices still work on your phone</li>
      </ul>
      {backTo ? (
        <Link to={backTo} className="coding-viewport-gate-back">
          {backLabel}
        </Link>
      ) : null}
    </div>
  )
}

export default CodingViewportGate
