import { Outlet } from 'react-router-dom'
import Navbar from '../Navbar'
import AppNavbar from '../AppNavbar'
import Footer from '../Footer'
import { useAuth } from '../../context/AuthContext'

const PageLayout = () => {
  const { isAuthenticated } = useAuth()

  // Public marketing pages (home, blog, etc.) should render immediately.
  // Auth bootstrap still runs in AuthProvider and updates the navbar when ready.
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
    </>
  )
}

export default PageLayout
