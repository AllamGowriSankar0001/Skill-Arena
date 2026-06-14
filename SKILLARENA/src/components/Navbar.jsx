import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import BrandLogo from './BrandLogo'
import { useAuth } from '../context/AuthContext'
import { useNavbarScroll } from '../hooks/useNavbarScroll'
import { ROUTES } from '../routes'
import './Navbar.css'

const NAV_LINKS = [
  { label: 'FEATURES', to: `${ROUTES.home}#features` },
  { label: 'BATTLES', to: `${ROUTES.home}#battles` },
  { label: 'LEARN', to: `${ROUTES.home}#learn` },
  { label: 'COMMUNITY', to: `${ROUTES.home}#community` },
]

const Navbar = ({ alwaysVisible = false }) => {
  const { isVisible, hasBorder } = useNavbarScroll()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, logout } = useAuth()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname, location.hash])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)
  const showNavbar = alwaysVisible || menuOpen || isVisible
  const isLoginPage = location.pathname === ROUTES.login
  const isSignupPage = location.pathname === ROUTES.signup

  return (
    <>
      <nav
        className={`navbar${showNavbar ? '' : ' navbar--hidden'}${hasBorder || menuOpen || alwaysVisible ? ' navbar--bordered' : ''}${menuOpen ? ' navbar--menu-open' : ''}${alwaysVisible ? ' navbar--static' : ''}`}
      >
        <Link to={ROUTES.home} className="navbar-logo" aria-label="Skill Arena home">
          <BrandLogo />
        </Link>

        <ul className="navbar-links navbar-links--desktop">
          {NAV_LINKS.map(({ label, to }) => (
            <li key={label}>
              <Link to={to}>{label}</Link>
            </li>
          ))}
        </ul>

        <div className="navbar-actions navbar-actions--desktop">
          {isAuthenticated ? (
            <>
              <Link to={ROUTES.dashboard} className="navbar-login">
                DASHBOARD
              </Link>
              <button
                type="button"
                className="navbar-signup"
                onClick={() => {
                  logout()
                  navigate(ROUTES.home)
                }}
              >
                LOG OUT
              </button>
            </>
          ) : (
            <>
              <Link
                to={ROUTES.login}
                className={`navbar-login${isLoginPage ? ' navbar-login--active' : ''}`}
              >
                LOGIN
              </Link>
              <Link
                to={ROUTES.signup}
                className={`navbar-signup${isSignupPage ? ' navbar-signup--active' : ''}`}
              >
                SIGN UP <span aria-hidden="true">→</span>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="navbar-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="navbar-mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="navbar-toggle-line" />
          <span className="navbar-toggle-line" />
          <span className="navbar-toggle-line" />
        </button>
      </nav>

      <button
        type="button"
        className={`navbar-mobile-backdrop${menuOpen ? ' navbar-mobile-backdrop--open' : ''}`}
        aria-label="Close menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={closeMenu}
      />

      <div
        id="navbar-mobile-menu"
        className={`navbar-mobile${menuOpen ? ' navbar-mobile--open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <ul className="navbar-mobile-links">
          {NAV_LINKS.map(({ label, to }) => (
            <li key={label}>
              <Link to={to} onClick={closeMenu}>
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="navbar-mobile-actions">
          {isAuthenticated ? (
            <>
              <Link to={ROUTES.dashboard} className="navbar-login" onClick={closeMenu}>
                DASHBOARD
              </Link>
              <button
                type="button"
                className="navbar-signup"
                onClick={() => {
                  logout()
                  closeMenu()
                  navigate(ROUTES.home)
                }}
              >
                LOG OUT
              </button>
            </>
          ) : (
            <>
              <Link
                to={ROUTES.login}
                className={`navbar-login${isLoginPage ? ' navbar-login--active' : ''}`}
                onClick={closeMenu}
              >
                LOGIN
              </Link>
              <Link
                to={ROUTES.signup}
                className={`navbar-signup${isSignupPage ? ' navbar-signup--active' : ''}`}
                onClick={closeMenu}
              >
                SIGN UP <span aria-hidden="true">→</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default Navbar
