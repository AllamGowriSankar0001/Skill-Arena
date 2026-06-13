export const CURSOR_TRAIL_COUNT = 20
export const CURSOR_TRAIL_LERP = 0.3
export const CURSOR_TRAIL_SIZE = 24
export const CURSOR_TRAIL_COLOR = '#000000'

export const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)'
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export function isCursorTrailSupported() {
  return (
    window.matchMedia(FINE_POINTER_QUERY).matches &&
    !window.matchMedia(REDUCED_MOTION_QUERY).matches
  )
}
