import { Outlet } from 'react-router-dom'
import Navbar from '../Navbar'
import Footer from '../Footer'
import CursorTrail from '../CursorTrail'

const PageLayout = () => {
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
