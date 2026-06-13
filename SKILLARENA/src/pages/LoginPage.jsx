import { Link } from 'react-router-dom'
import { ROUTES } from '../routes'
import PageShell from './PageShell'

const LoginPage = () => {
  return (
    <PageShell
      eyebrow="Account"
      title="Welcome back to the arena."
      description="Log in to continue learning, join battles, and track your progress."
    >
      <form className="page-shell-form" onSubmit={(event) => event.preventDefault()}>
        <div className="page-shell-field">
          <label htmlFor="login-email">Email</label>
          <input id="login-email" type="email" name="email" placeholder="you@example.com" />
        </div>

        <div className="page-shell-field">
          <label htmlFor="login-password">Password</label>
          <input id="login-password" type="password" name="password" placeholder="Enter your password" />
        </div>

        <button type="submit" className="page-shell-submit">
          Log in
        </button>
      </form>

      <p className="page-shell-switch">
        New here? <Link to={ROUTES.signup}>Create a free account</Link>
      </p>
    </PageShell>
  )
}

export default LoginPage
