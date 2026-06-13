import { Link } from 'react-router-dom'
import { ROUTES } from '../routes'
import PageShell from './PageShell'

const SignupPage = () => {
  return (
    <PageShell
      eyebrow="Account"
      title="Create your free arena account."
      description="Join Skill Arena free. No credit card. No paywalls. Just learning that feels like winning."
    >
      <form className="page-shell-form" onSubmit={(event) => event.preventDefault()}>
        <div className="page-shell-field">
          <label htmlFor="signup-name">Full name</label>
          <input id="signup-name" type="text" name="name" placeholder="Your name" />
        </div>

        <div className="page-shell-field">
          <label htmlFor="signup-email">Email</label>
          <input id="signup-email" type="email" name="email" placeholder="you@example.com" />
        </div>

        <div className="page-shell-field">
          <label htmlFor="signup-password">Password</label>
          <input id="signup-password" type="password" name="password" placeholder="Create a password" />
        </div>

        <button type="submit" className="page-shell-submit">
          Create free account
        </button>
      </form>

      <p className="page-shell-switch">
        Already have an account? <Link to={ROUTES.login}>Log in</Link>
      </p>
    </PageShell>
  )
}

export default SignupPage
