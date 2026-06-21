import { Outlet, useLocation } from 'react-router-dom'
import AppNavbar from '../AppNavbar'
import Footer from '../Footer'
import { ROUTES } from '../../routes'

const AppLayout = () => {
  const location = useLocation()
  const isCommunity = location.pathname === ROUTES.community

  return (
    <>
      <AppNavbar />
      <Outlet />
      {isCommunity ? null : <Footer />}
    </>
  )
}

export default AppLayout
