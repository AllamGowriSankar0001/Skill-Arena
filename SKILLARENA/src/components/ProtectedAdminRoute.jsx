import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../routes'

const ProtectedAdminRoute = ({ children }) => {
  const { isAuthenticated, bootstrapping, user } = useAuth()

  if (bootstrapping) {
    return <div className="app-loading">Loading…</div>
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace />
  }

  if (user?.role !== 'ADMIN') {
    return <Navigate to={ROUTES.dashboard} replace />
  }

  return children
}

export default ProtectedAdminRoute
