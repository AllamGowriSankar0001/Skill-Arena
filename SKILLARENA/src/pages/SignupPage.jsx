import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import AuthCard, { AuthFooterLink } from '../components/auth/AuthCard'
import PasswordField from '../components/auth/PasswordField'
import { useAuth } from '../context/AuthContext'
import { getHomeRouteForUser, ROUTES } from '../routes'

const SignupPage = () => {
  const navigate = useNavigate()
  const { signup, loading, isAuthenticated, bootstrapping, user } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!bootstrapping && isAuthenticated) {
      navigate(getHomeRouteForUser(user), { replace: true })
    }
  }, [bootstrapping, isAuthenticated, navigate, user])

  if (bootstrapping) {
    return (
      <main className="auth-page">
        <div className="app-loading" style={{ minHeight: 'auto', background: 'transparent' }}>
          Loading…
        </div>
      </main>
    )
  }

  if (!bootstrapping && isAuthenticated) {
    return <Navigate to={getHomeRouteForUser(user)} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    try {
      const newUser = await signup(name, email, password)
      navigate(getHomeRouteForUser(newUser))
    } catch (err) {
      setError(err.message || 'Signup failed')
    }
  }

  return (
    <AuthCard
      eyebrow="Create account"
      title="Join Skill Arena"
      description="Set up your account to use the AI Resume Builder and get ready for upcoming Learn, Practice, and Battle features."
      footer={
        <>
          <AuthFooterLink to={ROUTES.login}>Already have an account? Sign in</AuthFooterLink>
          <AuthFooterLink to={ROUTES.home}>Back to homepage</AuthFooterLink>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error ? <p className="auth-error">{error}</p> : null}

        <div className="auth-field">
          <label htmlFor="signup-name">Full name</label>
          <input
            id="signup-name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <PasswordField
          id="signup-password"
          label="Password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={6}
        />

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthCard>
  )
}

export default SignupPage
