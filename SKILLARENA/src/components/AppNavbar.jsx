import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import BrandLogo from './BrandLogo'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../routes'
import './AppNavbar.css'

const APP_LINKS = [
  { label: 'Dashboard', to: ROUTES.dashboard },
  { label: 'Learn', to: ROUTES.learn, comingSoon: true },
  { label: 'Practice', to: ROUTES.practice, comingSoon: true },
  { label: 'Battles', to: ROUTES.battles, comingSoon: true },
  { label: 'Leaderboard', to: ROUTES.leaderboard },
  { label: 'Resume', to: ROUTES.resume, isNew: true },
]

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'SA'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

const AppNavbar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const firstName = user?.name?.split(' ')[0] || 'User'
  const initials = getInitials(user?.name)

  const isActive = (path) =>
    location.pathname === path || (path !== ROUTES.dashboard && location.pathname.startsWith(`${path}/`))

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  const handleLogout = () => {
    closeMenu()
    logout()
    navigate(ROUTES.login)
  }

  const renderNavLink = (link, onNavigate) => {
    const { label, to, comingSoon, isNew } = link
    return (
      <Link
        key={label}
        to={to}
        className={`app-navbar-link${isActive(to) ? ' app-navbar-link--active' : ''}`}
        onClick={onNavigate}
      >
        <span>{label}</span>
        {comingSoon ? <span className="app-navbar-tag app-navbar-tag--soon">Soon</span> : null}
        {isNew ? <span className="app-navbar-tag app-navbar-tag--new">New</span> : null}
      </Link>
    )
  }

  return (
    <>
      <header className={`app-navbar${menuOpen ? ' app-navbar--menu-open' : ''}`}>
        <div className="app-navbar-inner">
          <Link to={ROUTES.dashboard} className="app-navbar-logo" aria-label="Skill Arena home">
            <BrandLogo />
          </Link>

          <nav className="app-navbar-links app-navbar-links--desktop" aria-label="Main">
            {APP_LINKS.map((link) => renderNavLink(link))}
          </nav>

          <div className="app-navbar-actions app-navbar-actions--desktop">
            <Link
              to={ROUTES.profile}
              className={`app-navbar-user${location.pathname === ROUTES.profile ? ' app-navbar-user--active' : ''}`}
            >
              <span className="app-navbar-avatar" aria-hidden="true">
                {initials}
              </span>
              <span className="app-navbar-user-text">
                <span className="app-navbar-user-name">{firstName}</span>
                {user?.level ? (
                  <span className="app-navbar-user-role">Lv {user.level}</span>
                ) : null}
              </span>
            </Link>
            <button type="button" className="app-navbar-logout" onClick={handleLogout}>
              Sign out
            </button>
          </div>

          <button
            type="button"
            className="app-navbar-toggle"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="app-navbar-mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="app-navbar-toggle-line" />
            <span className="app-navbar-toggle-line" />
            <span className="app-navbar-toggle-line" />
          </button>
        </div>
      </header>

      <button
        type="button"
        className={`app-navbar-backdrop${menuOpen ? ' app-navbar-backdrop--open' : ''}`}
        aria-label="Close menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={closeMenu}
      />

      <div
        id="app-navbar-mobile-menu"
        className={`app-navbar-mobile${menuOpen ? ' app-navbar-mobile--open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <div className="app-navbar-mobile-head">
          <p className="app-navbar-mobile-eyebrow">Navigation</p>
          <p className="app-navbar-mobile-lead">Quick links across Skill Arena.</p>
        </div>

        <nav className="app-navbar-mobile-links" aria-label="Main">
          {APP_LINKS.map((link) => renderNavLink(link, closeMenu))}
        </nav>

        <div className="app-navbar-mobile-foot">
          <p className="app-navbar-mobile-foot-label">Your account</p>
          <Link
            to={ROUTES.profile}
            className={`app-navbar-mobile-user${location.pathname === ROUTES.profile ? ' app-navbar-mobile-user--active' : ''}`}
            onClick={closeMenu}
          >
            <span className="app-navbar-avatar" aria-hidden="true">
              {initials}
            </span>
            <span className="app-navbar-user-text">
              <span className="app-navbar-user-name">{user?.name || firstName}</span>
              {user?.level ? (
                <span className="app-navbar-user-role">Level {user.level}</span>
              ) : (
                <span className="app-navbar-user-role">View profile</span>
              )}
            </span>
            <span className="app-navbar-mobile-user-arrow" aria-hidden="true">
              →
            </span>
          </Link>
          <button type="button" className="app-navbar-mobile-logout" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>
    </>
  )
}

export default AppNavbar
