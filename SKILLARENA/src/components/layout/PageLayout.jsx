import { Outlet } from 'react-router-dom'
import Navbar from '../Navbar'
import AppNavbar from '../AppNavbar'
import Footer from '../Footer'
import CursorTrail from '../CursorTrail'
import { useAuth } from '../../context/AuthContext'

const PageLayout = () => {
  const { isAuthenticated, bootstrapping } = useAuth()

  if (bootstrapping) {
    return <div className="app-loading">Loading…</div>
  }

  if (isAuthenticated) {
    return (
      <>
        <AppNavbar />
        <Outlet />
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
      <CursorTrail />
    </>
  )
}

export default PageLayout
