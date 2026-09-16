import { Link } from 'react-router-dom'
import BrandLogo from '../BrandLogo'
import PageBreadcrumb from '../PageBreadcrumb'
import ThemeToggle from '../ThemeToggle'
import { ROUTES } from '../../routes'
import './AuthCard.css'

const AuthCard = ({
  eyebrow,
  title,
  description,
  children,
  footer,
  panelTitle,
  panelDescription,
  panelPoints,
  breadcrumbLabel,
}) => {
  const pathLabel = breadcrumbLabel || eyebrow || 'Account'

  return (
    <main className="auth-split">
      <aside className="auth-split-panel" aria-hidden="false">
        <Link to={ROUTES.home} className="auth-split-logo" aria-label="Skill Arena home">
          <BrandLogo />
        </Link>

        <div className="auth-split-panel-body">
          <p className="auth-split-panel-eyebrow">{eyebrow || 'Skill Arena'}</p>
          <h1 className="auth-split-panel-title">
            {panelTitle || 'Learn fast. Battle harder.'}
          </h1>
          <p className="auth-split-panel-copy">
            {panelDescription ||
              'Sharpen real skills, compete in live matches, and climb the ladder with friends.'}
          </p>
          <ul className="auth-split-points">
            {(
              panelPoints || [
                'Free forever — no credit card',
                'Courses, practice, and battles in one place',
                'AI Resume Builder included',
              ]
            ).map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>

        <p className="auth-split-panel-foot">© 2028 Skill Arena</p>
      </aside>

      <section className="auth-split-form">
        <div className="auth-split-form-inner">
          <div className="auth-split-form-tools">
            <PageBreadcrumb
              className="auth-breadcrumb"
              items={[
                { label: 'Home', to: ROUTES.home },
                { label: pathLabel },
              ]}
            />
            <ThemeToggle />
          </div>

          <header className="auth-split-form-head">
            <p className="auth-eyebrow">{eyebrow}</p>
            <h2 className="auth-title">{title}</h2>
            {description ? <p className="auth-description">{description}</p> : null}
          </header>

          <div className="auth-form-card">{children}</div>
          {footer ? <div className="auth-form-footer">{footer}</div> : null}
        </div>
      </section>
    </main>
  )
}

export const AuthFooterLink = ({ children, to }) => (
  <p className="auth-switch">
    <Link to={to}>{children}</Link>
  </p>
)

export default AuthCard
