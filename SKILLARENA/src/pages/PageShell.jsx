import { Link } from 'react-router-dom'
import ScrollReveal from '../components/ScrollReveal'
import { ROUTES } from '../routes'
import './PageShell.css'

const PageShell = ({
  eyebrow,
  title,
  description,
  children,
  showBackLink = true,
  staticLayout = false,
}) => {
  return (
    <main className={`page-shell${staticLayout ? ' page-shell--static' : ''}`}>
      <div className="page-shell-inner">
        <ScrollReveal disabled={staticLayout}>
          <p className="page-shell-eyebrow">
            <span className="page-shell-eyebrow-line" aria-hidden="true" />
            {eyebrow}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={staticLayout ? 0 : 80} disabled={staticLayout}>
          <h1 className="page-shell-title">{title}</h1>
        </ScrollReveal>

        <ScrollReveal delay={staticLayout ? 0 : 160} disabled={staticLayout}>
          <p className="page-shell-description">{description}</p>
        </ScrollReveal>

        <ScrollReveal delay={staticLayout ? 0 : 240} disabled={staticLayout}>
          <div className="page-shell-body">{children}</div>
        </ScrollReveal>

        {showBackLink ? (
          <ScrollReveal delay={staticLayout ? 0 : 100} disabled={staticLayout}>
            <Link to={ROUTES.home} className="page-shell-back">
              Back to home <span aria-hidden="true">→</span>
            </Link>
          </ScrollReveal>
        ) : null}
      </div>
    </main>
  )
}

export default PageShell
