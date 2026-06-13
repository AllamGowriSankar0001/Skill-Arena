import { useEffect, useRef, useState } from 'react'
import {
  CURSOR_TRAIL_COLOR,
  CURSOR_TRAIL_COUNT,
  CURSOR_TRAIL_LERP,
  CURSOR_TRAIL_SIZE,
  isCursorTrailSupported,
} from '../hooks/useCursorTrail'
import './CursorTrail.css'

const CursorTrail = () => {
  const [enabled, setEnabled] = useState(false)
  const coordsRef = useRef({ x: 0, y: 0 })
  const trailRef = useRef(
    Array.from({ length: CURSOR_TRAIL_COUNT }, () => ({ x: 0, y: 0 })),
  )
  const circleRefs = useRef([])

  useEffect(() => {
    setEnabled(isCursorTrailSupported())
  }, [])

  useEffect(() => {
    if (!enabled) return

    const root = document.documentElement
    root.classList.add('cursor-trail-active')

    const onMove = ({ clientX, clientY }) => {
      coordsRef.current = { x: clientX, y: clientY }
    }

    let frameId = null

    const animate = () => {
      let x = coordsRef.current.x
      let y = coordsRef.current.y

      circleRefs.current.forEach((circle, index) => {
        if (!circle) return

        circle.style.left = `${x}px`
        circle.style.top = `${y}px`
        circle.style.transform = `scale(${(CURSOR_TRAIL_COUNT - index) / CURSOR_TRAIL_COUNT})`

        trailRef.current[index] = { x, y }

        const next = trailRef.current[index + 1] ?? trailRef.current[0]
        x += (next.x - x) * CURSOR_TRAIL_LERP
        y += (next.y - y) * CURSOR_TRAIL_LERP
      })

      frameId = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    frameId = requestAnimationFrame(animate)

    return () => {
      root.classList.remove('cursor-trail-active')
      window.removeEventListener('mousemove', onMove)
      if (frameId !== null) cancelAnimationFrame(frameId)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <>
      {Array.from({ length: CURSOR_TRAIL_COUNT }, (_, index) => (
        <div
          key={index}
          ref={(element) => {
            circleRefs.current[index] = element
          }}
          className="cursor-trail-circle"
          style={{
            backgroundColor: CURSOR_TRAIL_COLOR,
            '--cursor-trail-size': `${CURSOR_TRAIL_SIZE}px`,
          }}
          aria-hidden="true"
        />
      ))}
    </>
  )
}

export default CursorTrail
