import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../routes'
import skillArenaLogo from '../../assets/LOGO.png'
import './AdminLayout.css'

const AdminNavIcon = ({ name }) => {
  const icons = {
    overview: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="5" rx="1.5" />
        <rect x="13" y="10" width="8" height="11" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
      </svg>
    ),
    courses: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M5 5.5h11.5a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2z" />
        <path d="M8 5.5V4.5a2 2 0 0 1 2-2h9.5a2 2 0 0 1 2 2V16" />
      </svg>
    ),
    practice: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 3.5V6M12 18v2.5M3.5 12H6M18 12h2.5" />
      </svg>
    ),
    blog: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M6 4.5h12a2 2 0 0 1 2 2v13l-4-2.5-4 2.5-4-2.5-4 2.5V6.5a2 2 0 0 1 2-2z" />
        <path d="M9 9h6M9 12.5h6" />
      </svg>
    ),
    resume: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M8 3.5h8l4.5 4.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2z" />
        <path d="M15.5 3.5V8h4.5M9 12.5h6M9 16h4" />
      </svg>
    ),
    resumes: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M5.5 4.5h7l3 3v12.5a1.5 1.5 0 0 1-1.5 1.5h-8.5A1.5 1.5 0 0 1 4.5 20V6a1.5 1.5 0 0 1 1-1.5z" />
        <path d="M12.5 4.5V8h3M8 12.5h5M8 16h3.5" />
        <path d="M16.5 8.5H19a1.5 1.5 0 0 1 1.5 1.5V20a1.5 1.5 0 0 1-1.5 1.5H14" />
      </svg>
    ),
    users: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M3.5 19.5c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
        <path d="M16 8.5a2.5 2.5 0 1 1 0 5" />
        <path d="M19.5 19.5c0-2.2-1.5-4-3.5-4.5" />
      </svg>
    ),
    community: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 6.5h16a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H9l-4 3v-3H4a1.5 1.5 0 0 1-1.5-1.5V8a1.5 1.5 0 0 1 1.5-1.5z" />
        <path d="M8 10.5h8M8 13.5h5" />
      </svg>
    ),
  }

  return <span className="admin-nav-icon">{icons[name]}</span>
}

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: ROUTES.admin, icon: 'overview', exact: true }],
  },
  {
    label: 'Content',
    items: [
      { label: 'Courses', to: ROUTES.adminCourses, icon: 'courses' },
      { label: 'Practice', to: ROUTES.adminPractice, icon: 'practice' },
      { label: 'Blog', to: ROUTES.adminBlog, icon: 'blog' },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Users', to: ROUTES.adminUsers, icon: 'users' },
      { label: 'Community', to: ROUTES.adminCommunity, icon: 'community' },
      { label: 'Resume builder', to: ROUTES.adminResume, icon: 'resume' },
      { label: 'User resumes', to: ROUTES.adminResumes, icon: 'resumes' },
    ],
  },
]

const isNavItemActive = (pathname, to, exact = false) => {
  if (exact) return pathname === to
  return pathname === to || pathname.startsWith(`${to}/`)
}

const AdminLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const userInitial = useMemo(() => {
    const source = user?.name?.trim() || user?.email?.trim() || 'A'
    return source.charAt(0).toUpperCase()
  }, [user?.email, user?.name])

  const handleLogout = () => {
    logout()
    navigate(ROUTES.login)
  }

  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const isFullBleed = location.pathname === ROUTES.adminCommunity
  const isCommunityRoute = location.pathname === ROUTES.adminCommunity
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isCommunityRoute)

  useEffect(() => {
    if (isCommunityRoute) {
      setSidebarCollapsed(true)
    }
  }, [isCommunityRoute])

  const shellClassName = [
    'admin-shell',
    menuOpen ? 'admin-shell--menu-open' : '',
    sidebarCollapsed ? 'admin-shell--sidebar-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={shellClassName}>
      <header className={`admin-mobile-topbar${menuOpen ? ' admin-mobile-topbar--open' : ''}`}>
        <Link to={ROUTES.admin} className="admin-mobile-brand" onClick={closeMenu}>
          <img src={skillArenaLogo} alt="" className="admin-brand-logo" aria-hidden="true" />
          <div className="admin-mobile-brand-copy">
            <strong>Skill Arena</strong>
            <span>Admin console</span>
          </div>
        </Link>

        <button
          type="button"
          className="admin-menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="admin-mobile-nav"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="admin-menu-toggle-line" />
          <span className="admin-menu-toggle-line" />
          <span className="admin-menu-toggle-line" />
        </button>
      </header>

      <aside id="admin-mobile-nav" className="admin-sidebar">
        <div className="admin-sidebar-top">
          <Link to={ROUTES.admin} className="admin-brand" onClick={closeMenu}>
            <img src={skillArenaLogo} alt="" className="admin-brand-logo" aria-hidden="true" />
            <div className="admin-brand-copy">
              <strong>Skill Arena</strong>
              <span>Admin console</span>
            </div>
          </Link>
          <button
            type="button"
            className="admin-sidebar-collapse"
            onClick={() => setSidebarCollapsed((current) => !current)}
            aria-label={sidebarCollapsed ? 'Expand admin navigation' : 'Collapse admin navigation'}
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {sidebarCollapsed ? (
                <path d="M9 6l6 6-6 6" />
              ) : (
                <path d="M15 18l-6-6 6-6" />
              )}
            </svg>
          </button>
        </div>

        <nav className="admin-nav" aria-label="Admin navigation">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="admin-nav-group">
              <p className="admin-nav-group-label">{group.label}</p>
              <div className="admin-nav-group-items">
                {group.items.map((item) => {
                  const active = isNavItemActive(location.pathname, item.to, item.exact)
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`admin-nav-link${active ? ' admin-nav-link--active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                      title={sidebarCollapsed ? item.label : undefined}
                      onClick={closeMenu}
                    >
                      <AdminNavIcon name={item.icon} />
                      <span className="admin-nav-link-label">{item.label}</span>
                      <span className="admin-nav-link-arrow" aria-hidden="true">
                        →
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <div className="admin-sidebar-user">
            <span className="admin-sidebar-avatar" aria-hidden="true">
              {userInitial}
            </span>
            <div className="admin-sidebar-user-copy">
              <strong>{user?.name || 'Administrator'}</strong>
              <span>{user?.email || 'Admin access'}</span>
            </div>
          </div>
          <div className="admin-sidebar-actions">
            <Link to={ROUTES.home} className="admin-sidebar-action" onClick={closeMenu}>
              View site
            </Link>
            <button type="button" className="admin-sidebar-action admin-sidebar-action--logout" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </aside>

      <button
        type="button"
        className={`admin-menu-backdrop${menuOpen ? ' admin-menu-backdrop--open' : ''}`}
        aria-label="Close menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={closeMenu}
      />

      <main className={`admin-main${isFullBleed ? ' admin-main--fullbleed' : ''}`}>
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
