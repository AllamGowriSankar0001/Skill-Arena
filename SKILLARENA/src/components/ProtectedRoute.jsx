import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getHomeRouteForUser, ROUTES } from '../routes'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, bootstrapping, user } = useAuth()

  if (bootstrapping) {
    return <div className="app-loading">Loading…</div>
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace />
  }

  if (user?.role === 'ADMIN') {
    return <Navigate to={ROUTES.admin} replace />
  }

  return children
}

export default ProtectedRoute
