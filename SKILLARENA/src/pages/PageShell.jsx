import { Link } from 'react-router-dom'
import ScrollReveal from '../components/ScrollReveal'
import { ROUTES } from '../routes'
import './PageShell.css'

const PageShell = ({ eyebrow, title, description, children, showBackLink = true }) => {
  return (
    <main className="page-shell">
      <div className="page-shell-inner">
        <ScrollReveal>
          <p className="page-shell-eyebrow">
            <span className="page-shell-eyebrow-line" aria-hidden="true" />
            {eyebrow}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={80}>
          <h1 className="page-shell-title">{title}</h1>
        </ScrollReveal>

        <ScrollReveal delay={160}>
          <p className="page-shell-description">{description}</p>
        </ScrollReveal>

        <ScrollReveal delay={240}>
          <div className="page-shell-body">{children}</div>
        </ScrollReveal>

        {showBackLink ? (
          <ScrollReveal delay={100}>
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
