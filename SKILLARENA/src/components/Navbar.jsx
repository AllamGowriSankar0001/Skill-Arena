import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import BrandLogo from './BrandLogo'
import { useNavbarScroll } from '../hooks/useNavbarScroll'
import { ROUTES } from '../routes'
import './Navbar.css'

const NAV_LINKS = [
  { label: 'FEATURES', to: `${ROUTES.home}#features` },
  { label: 'BATTLES', to: `${ROUTES.home}#battles` },
  { label: 'LEARN', to: `${ROUTES.home}#learn` },
  { label: 'COMMUNITY', to: `${ROUTES.home}#community` },
]

const Navbar = () => {
  const { isVisible, hasBorder } = useNavbarScroll()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

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

  return (
    <nav
      className={`navbar${isVisible ? '' : ' navbar--hidden'}${hasBorder ? ' navbar--bordered' : ''}${menuOpen ? ' navbar--menu-open' : ''}`}
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
        <Link to={ROUTES.login} className="navbar-login">
          LOGIN
        </Link>
        <Link to={ROUTES.signup} className="navbar-signup">
          SIGN UP <span aria-hidden="true">→</span>
        </Link>
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

      <div
        id="navbar-mobile-menu"
        className={`navbar-mobile${menuOpen ? ' navbar-mobile--open' : ''}`}
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
          <Link to={ROUTES.login} className="navbar-login" onClick={closeMenu}>
            LOGIN
          </Link>
          <Link to={ROUTES.signup} className="navbar-signup" onClick={closeMenu}>
            SIGN UP <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
