import { Link } from 'react-router-dom'
import './AuthCard.css'

const AuthCard = ({ eyebrow, title, description, children, footer }) => (
  <main className="auth-page">
    <div className="auth-page-inner">
      <section className="auth-brand">
        <p className="auth-eyebrow">{eyebrow}</p>
        <h1 className="auth-title">{title}</h1>
        <p className="auth-description">{description}</p>
        <ul className="auth-points">
          <li>Students, creators, and admins use one account</li>
          <li>AI Resume Builder available now</li>
          <li>Learn, Practice, and Battles launching soon</li>
        </ul>
      </section>

      <section className="auth-form-wrap">
        <div className="auth-form-card">{children}</div>
        {footer ? <div className="auth-form-footer">{footer}</div> : null}
      </section>
    </div>
  </main>
)

export const AuthFooterLink = ({ children, to }) => (
  <p className="auth-switch">
    <Link to={to}>{children}</Link>
  </p>
)

export default AuthCard
