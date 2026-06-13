import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from '../Navbar'
import Footer from '../Footer'
import CursorTrail from '../CursorTrail'

const PageLayout = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])

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
