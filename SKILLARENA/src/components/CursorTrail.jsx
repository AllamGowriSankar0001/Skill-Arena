import { useEffect, useRef, useState } from 'react'
import {
  CURSOR_TRAIL_COLOR,
  CURSOR_TRAIL_COUNT,
  CURSOR_TRAIL_LERP,
  CURSOR_TRAIL_LERP_INTERACTIVE,
  CURSOR_TRAIL_SIZE,
  CURSOR_TRAIL_SIZE_INTERACTIVE,
  isCursorTrailSupported,
  isInteractiveCursorTarget,
} from '../hooks/useCursorTrail'
import './CursorTrail.css'

const getTrailScale = (index, interactive) => {
  const progress = (CURSOR_TRAIL_COUNT - index) / CURSOR_TRAIL_COUNT
  if (interactive) {
    return Math.max(0.1, Math.pow(progress, 0.65))
  }
  return progress
}

const CursorTrail = () => {
  const [enabled, setEnabled] = useState(false)
  const coordsRef = useRef({ x: 0, y: 0 })
  const trailRef = useRef(
    Array.from({ length: CURSOR_TRAIL_COUNT }, () => ({ x: 0, y: 0 })),
  )
  const circleRefs = useRef([])
  const modeRef = useRef({ interactive: false, pressed: false })

  useEffect(() => {
    setEnabled(isCursorTrailSupported())
  }, [])

  useEffect(() => {
    if (!enabled) return

    const root = document.documentElement

    const syncModeClasses = () => {
      const { interactive, pressed } = modeRef.current
      const active = interactive || pressed

      root.classList.toggle('cursor-trail-interactive', active)
      root.classList.toggle('cursor-trail-pressed', pressed)
      root.style.setProperty(
        '--cursor-trail-size',
        active ? `${CURSOR_TRAIL_SIZE_INTERACTIVE}px` : `${CURSOR_TRAIL_SIZE}px`,
      )
    }

    root.classList.add('cursor-trail-active')
    syncModeClasses()

    const onMove = ({ clientX, clientY }) => {
      coordsRef.current = { x: clientX, y: clientY }

      const target = document.elementFromPoint(clientX, clientY)
      modeRef.current.interactive = isInteractiveCursorTarget(target)
      syncModeClasses()
    }

    const onDown = () => {
      modeRef.current.pressed = true
      syncModeClasses()
    }

    const onUp = () => {
      modeRef.current.pressed = false
      syncModeClasses()
    }

    let frameId = null

    const animate = () => {
      let x = coordsRef.current.x
      let y = coordsRef.current.y
      const { interactive, pressed } = modeRef.current
      const active = interactive || pressed
      const lerp = active ? CURSOR_TRAIL_LERP_INTERACTIVE : CURSOR_TRAIL_LERP
      const headBoost = pressed ? 1.12 : 1

      circleRefs.current.forEach((circle, index) => {
        if (!circle) return

        const scale = getTrailScale(index, active) * (index === 0 ? headBoost : 1)

        circle.style.left = `${x}px`
        circle.style.top = `${y}px`
        circle.style.transform = `scale(${scale})`
        circle.style.opacity = active
          ? String(Math.max(0.18, 1 - index * 0.042))
          : String(Math.max(0.25, 1 - index * 0.035))

        trailRef.current[index] = { x, y }

        const next = trailRef.current[index + 1] ?? trailRef.current[0]
        x += (next.x - x) * lerp
        y += (next.y - y) * lerp
      })

      frameId = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mousedown', onDown, { passive: true })
    window.addEventListener('mouseup', onUp, { passive: true })
    frameId = requestAnimationFrame(animate)

    return () => {
      root.classList.remove(
        'cursor-trail-active',
        'cursor-trail-interactive',
        'cursor-trail-pressed',
      )
      root.style.removeProperty('--cursor-trail-size')
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
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
