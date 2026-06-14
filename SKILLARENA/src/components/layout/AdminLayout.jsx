import { useState } from 'react'
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
  }

  return <span className="admin-nav-icon">{icons[name]}</span>
}

const NAV_ITEMS = [
  { label: 'Overview', to: ROUTES.admin, icon: 'overview' },
  { label: 'Courses', to: ROUTES.adminCourses, icon: 'courses' },
  { label: 'Practice', to: ROUTES.adminPractice, icon: 'practice' },
  { label: 'Blog', to: ROUTES.adminBlog, icon: 'blog' },
  { label: 'Users', to: ROUTES.adminUsers, icon: 'users' },
  { label: 'Resume', to: ROUTES.adminResume, icon: 'resume' },
  { label: 'User resumes', to: ROUTES.adminResumes, icon: 'resumes' },
]

const AdminLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate(ROUTES.login)
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <div className={`admin-shell${menuOpen ? ' admin-shell--menu-open' : ''}`}>
      <div className="admin-mobile-topbar">
        <button type="button" className="admin-menu-toggle" onClick={() => setMenuOpen((open) => !open)}>
          ☰ Menu
        </button>
        <div className="admin-mobile-brand">
          <img src={skillArenaLogo} alt="" className="admin-brand-logo" aria-hidden="true" />
          <div>
            <strong>Skill Arena</strong>
            <span>Admin</span>
          </div>
        </div>
      </div>

      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src={skillArenaLogo} alt="" className="admin-brand-logo" aria-hidden="true" />
          <div>
            <strong>Skill Arena</strong>
            <p>Admin console</p>
          </div>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`admin-nav-link${location.pathname === item.to ? ' admin-nav-link--active' : ''}`}
              onClick={closeMenu}
            >
              <AdminNavIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <p>{user?.name}</p>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      {menuOpen ? (
        <button
          type="button"
          className="admin-menu-backdrop"
          aria-label="Close menu"
          onClick={closeMenu}
        />
      ) : null}

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
