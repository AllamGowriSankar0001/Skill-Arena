import { useEffect, useState } from 'react'
import { CODING_VIEWPORT_MEDIA_QUERY } from '../constants/codingViewport'

export function useCodingViewportAllowed() {
  const [allowed, setAllowed] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia(CODING_VIEWPORT_MEDIA_QUERY).matches
  })

  useEffect(() => {
    const media = window.matchMedia(CODING_VIEWPORT_MEDIA_QUERY)
    const sync = () => setAllowed(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return allowed
}

export default useCodingViewportAllowed
