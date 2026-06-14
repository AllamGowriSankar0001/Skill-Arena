import { Link } from 'react-router-dom'
import { ROUTES } from '../routes'
import './ComingSoonPanel.css'

const ComingSoonPanel = ({
  eyebrow,
  title,
  description,
  showResumePromo = true,
}) => (
  <main className="coming-soon">
    <div className="coming-soon-inner">
      <div className="coming-soon-card">
        <span className="coming-soon-badge">Coming soon</span>
        {eyebrow ? <p className="coming-soon-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        <p className="coming-soon-copy">{description}</p>
        <p className="coming-soon-note">We&apos;re building this experience. Check back shortly.</p>
      </div>

      {showResumePromo ? (
        <aside className="coming-soon-promo">
          <span className="coming-soon-promo-badge">Available now</span>
          <h2>AI Resume Builder</h2>
          <p>
            Tailor your resume to any job description with AI — ATS-friendly preview and PDF export.
          </p>
          <Link to={ROUTES.resume} className="coming-soon-promo-btn">
            Open resume builder
          </Link>
        </aside>
      ) : null}
    </div>
  </main>
)

export default ComingSoonPanel
