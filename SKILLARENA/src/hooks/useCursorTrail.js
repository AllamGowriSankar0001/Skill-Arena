export const CURSOR_TRAIL_COUNT = 20
export const CURSOR_TRAIL_LERP = 0.3
export const CURSOR_TRAIL_LERP_INTERACTIVE = 0.22
export const CURSOR_TRAIL_SIZE = 24
export const CURSOR_TRAIL_SIZE_INTERACTIVE = 40
export const CURSOR_TRAIL_COLOR = '#000000'

export const INTERACTIVE_CURSOR_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'textarea',
  'select',
  'label',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)'
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export function isCursorTrailSupported() {
  return (
    window.matchMedia(FINE_POINTER_QUERY).matches &&
    !window.matchMedia(REDUCED_MOTION_QUERY).matches
  )
}

export function isInteractiveCursorTarget(element) {
  if (!element || !(element instanceof Element)) return false
  return Boolean(element.closest(INTERACTIVE_CURSOR_SELECTOR))
}
