import { Navigate, useLocation } from 'react-router-dom'
import PageLoadingSkeleton from './PageLoadingSkeleton'
import { useAuth } from '../context/AuthContext'
import { getHomeRouteForUser, ROUTES } from '../routes'

const ProtectedRoute = ({ children }) => {
  const location = useLocation()
  const { isAuthenticated, bootstrapping, user } = useAuth()

  if (bootstrapping) {
    return (
      <div className="app-loading-bone">
        <PageLoadingSkeleton label="Checking session" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />
  }

  if (user?.role === 'ADMIN') {
    return <Navigate to={getHomeRouteForUser(user)} replace />
  }

  return children
}

export default ProtectedRoute
