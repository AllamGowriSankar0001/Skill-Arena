import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const scrollContainerToTop = (element) => {
  if (!element) return
  element.scrollTop = 0
  element.scrollLeft = 0
}

const ScrollToTop = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    scrollContainerToTop(document.documentElement)
    scrollContainerToTop(document.body)
    scrollContainerToTop(document.querySelector('.admin-main'))
  }, [pathname])

  return null
}

export default ScrollToTop
