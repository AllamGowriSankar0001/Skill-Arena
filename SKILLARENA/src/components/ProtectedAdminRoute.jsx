import { Navigate, useLocation } from 'react-router-dom'
import PageLoadingSkeleton from './PageLoadingSkeleton'
import { useAuth } from '../context/AuthContext'
import { ROUTES } from '../routes'

const ProtectedAdminRoute = ({ children }) => {
  const location = useLocation()
  const { isAuthenticated, bootstrapping, user } = useAuth()

  if (bootstrapping) {
    return (
      <div className="app-loading-bone">
        <PageLoadingSkeleton label="Checking admin session" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />
  }

  if (user?.role !== 'ADMIN') {
    return <Navigate to={ROUTES.dashboard} replace />
  }

  return children
}

export default ProtectedAdminRoute
