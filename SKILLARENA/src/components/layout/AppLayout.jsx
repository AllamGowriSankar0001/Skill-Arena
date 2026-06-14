import { Outlet } from 'react-router-dom'
import AppNavbar from '../AppNavbar'
import Footer from '../Footer'

const AppLayout = () => {
  return (
    <>
      <AppNavbar />
      <Outlet />
      <Footer />
    </>
  )
}

export default AppLayout
