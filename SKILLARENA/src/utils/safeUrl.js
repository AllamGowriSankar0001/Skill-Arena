/**
 * Sanitize markdown / user-facing hrefs.
 * Allows http(s), mailto, and relative paths. Blocks javascript:, data:, vbscript:, etc.
 */
export function sanitizeHref(href) {
  if (href == null) return null
  const raw = String(href).trim()
  if (!raw) return null

  // Protocol-relative URLs
  if (raw.startsWith('//')) {
    return `https:${raw}`
  }

  // Relative / hash / query paths
  if (
    raw.startsWith('/') ||
    raw.startsWith('#') ||
    raw.startsWith('?') ||
    raw.startsWith('./') ||
    raw.startsWith('../')
  ) {
    return raw
  }

  const lower = raw.toLowerCase()
  if (
    lower.startsWith('https:') ||
    lower.startsWith('http:') ||
    lower.startsWith('mailto:')
  ) {
    return raw
  }

  return null
}
