import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import BrandLogo from './BrandLogo'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../routes'
import { formatXpLabel } from '../utils/xpSync'
import './AppNavbar.css'

const NAVBAR_LINKS = [{ label: 'Dashboard', to: ROUTES.dashboard }]

const DROPDOWN_LINKS = [
  { label: 'Learn', to: ROUTES.learn },
  { label: 'Practice', to: ROUTES.practice },
  { label: 'Leaderboard', to: ROUTES.leaderboard },
  { label: 'Resume', to: ROUTES.resume },
  { label: 'Profile', to: ROUTES.profile },
]

const MOBILE_EXTRA_LINKS = [{ label: 'Battles', to: ROUTES.battles, comingSoon: true }]

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
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  const firstName = user?.name?.split(' ')[0] || 'User'
  const initials = getInitials(user?.name)

  const isActive = (path) =>
    location.pathname === path || (path !== ROUTES.dashboard && location.pathname.startsWith(`${path}/`))

  useEffect(() => {
    setMenuOpen(false)
    setUserMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  useEffect(() => {
    if (!userMenuOpen) return undefined

    const handlePointerDown = (event) => {
      if (!userMenuRef.current?.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') setUserMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [userMenuOpen])

  const closeMenu = () => setMenuOpen(false)

  const handleLogout = () => {
    closeMenu()
    setUserMenuOpen(false)
    logout()
    navigate(ROUTES.login)
  }

  const renderNavLink = (link, onNavigate, { showTags = false } = {}) => {
    const { label, to, comingSoon } = link

    if (comingSoon) {
      return (
        <span key={label} className="app-navbar-link app-navbar-link--disabled" aria-disabled="true">
          <span>{label}</span>
          {showTags ? <span className="app-navbar-tag app-navbar-tag--soon">Soon</span> : null}
        </span>
      )
    }

    return (
      <Link
        key={label}
        to={to}
        className={`app-navbar-link${isActive(to) ? ' app-navbar-link--active' : ''}`}
        onClick={onNavigate}
      >
        <span>{label}</span>
      </Link>
    )
  }

  const renderDropdownLink = (link) => {
    const { label, to, comingSoon } = link

    if (comingSoon) {
      return (
        <span key={label} className="app-navbar-user-dropdown-link app-navbar-user-dropdown-link--disabled" aria-disabled="true">
          {label}
          <span className="app-navbar-tag app-navbar-tag--soon">Soon</span>
        </span>
      )
    }

    return (
      <Link
        key={label}
        to={to}
        className={`app-navbar-user-dropdown-link${isActive(to) ? ' app-navbar-user-dropdown-link--active' : ''}`}
        role="menuitem"
        onClick={() => setUserMenuOpen(false)}
      >
        {label}
      </Link>
    )
  }

  const mobileLinks = [...NAVBAR_LINKS, ...DROPDOWN_LINKS, ...MOBILE_EXTRA_LINKS]

  return (
    <>
      <header className={`app-navbar${menuOpen ? ' app-navbar--menu-open' : ''}`}>
        <div className="app-navbar-inner">
          <Link to={ROUTES.dashboard} className="app-navbar-logo" aria-label="Skill Arena home">
            <BrandLogo />
          </Link>

          <div className="app-navbar-actions app-navbar-actions--desktop">
            {NAVBAR_LINKS.map((link) => renderNavLink(link))}

            {user?.level ? (
              <span className="app-navbar-level-chip" title={user?.xp != null ? formatXpLabel(user.xp) : undefined}>
                Lv {user.level}
              </span>
            ) : null}

            <div className="app-navbar-user-menu" ref={userMenuRef}>
              <button
                type="button"
                className={`app-navbar-user-trigger${userMenuOpen ? ' app-navbar-user-trigger--open' : ''}`}
                aria-label="Account menu"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                onClick={() => setUserMenuOpen((open) => !open)}
              >
                <span className="app-navbar-avatar" aria-hidden="true">
                  {initials}
                </span>
              </button>

              {userMenuOpen ? (
                <div className="app-navbar-user-dropdown" role="menu">
                  <div className="app-navbar-user-dropdown-head">
                    <strong>{user?.name || firstName}</strong>
                    <span>
                      {user?.level ? `Level ${user.level}` : 'Student'}
                      {user?.xp != null ? ` · ${formatXpLabel(user.xp)}` : ''}
                    </span>
                  </div>
                  <div className="app-navbar-user-dropdown-links">
                    {DROPDOWN_LINKS.map((link) => renderDropdownLink(link))}
                  </div>
                  <button
                    type="button"
                    className="app-navbar-user-dropdown-logout"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
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
        <div className="app-navbar-mobile-account">
          <span className="app-navbar-avatar app-navbar-avatar--large" aria-hidden="true">
            {initials}
          </span>
          <div className="app-navbar-mobile-account-copy">
            <strong>{user?.name || firstName}</strong>
            <span>
              {user?.level ? `Level ${user.level}` : 'Student'}
              {user?.xp != null ? ` · ${formatXpLabel(user.xp)}` : ''}
            </span>
          </div>
        </div>

        <nav className="app-navbar-mobile-links" aria-label="Main">
          {mobileLinks.map((link) => renderNavLink(link, closeMenu, { showTags: true }))}
        </nav>

        <div className="app-navbar-mobile-foot">
          <button type="button" className="app-navbar-mobile-logout" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>
    </>
  )
}

export default AppNavbar
