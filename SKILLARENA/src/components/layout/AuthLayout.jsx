import { Outlet, Link } from 'react-router-dom'
import { ROUTES } from '../../routes'
import './AuthLayout.css'

const AuthLayout = () => {
  return (
    <div className="auth-layout">
      <Outlet />
      <Link to={ROUTES.home} className="auth-layout-home-link visually-hidden">
        Skill Arena home
      </Link>
    </div>
  )
}

export default AuthLayout
