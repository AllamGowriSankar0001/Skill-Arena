import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const scrollContainerToTop = (element) => {
  if (!element) return
  element.scrollTop = 0
  element.scrollLeft = 0
}

const ScrollToTop = () => {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    // Keep in-page section anchors (e.g. /#features) from being reset to the top.
    if (hash) return

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    scrollContainerToTop(document.documentElement)
    scrollContainerToTop(document.body)
    scrollContainerToTop(document.querySelector('.admin-main'))
  }, [pathname, hash])

  return null
}

export default ScrollToTop
