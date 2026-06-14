import { Outlet } from 'react-router-dom'
import Navbar from '../Navbar'
import Footer from '../Footer'
import './AuthLayout.css'

const AuthLayout = () => {
  return (
    <>
      <Navbar alwaysVisible />
      <div className="auth-layout-content">
        <Outlet />
      </div>
      <Footer />
    </>
  )
}

export default AuthLayout
