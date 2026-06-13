import { useEffect, useRef, useState } from 'react'

const SCROLL_THRESHOLD = 8
const TOP_OFFSET = 72

export function useNavbarScroll() {
  const [isVisible, setIsVisible] = useState(true)
  const [hasBorder, setHasBorder] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY
      const delta = currentY - lastScrollY.current

      if (currentY <= TOP_OFFSET) {
        setIsVisible(true)
        setHasBorder(false)
      } else if (delta > SCROLL_THRESHOLD) {
        setIsVisible(false)
        setHasBorder(true)
      } else if (delta < -SCROLL_THRESHOLD) {
        setIsVisible(true)
        setHasBorder(true)
      }

      lastScrollY.current = currentY
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return { isVisible, hasBorder }
}
