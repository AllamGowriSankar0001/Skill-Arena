import { isDisplayableImageUrl } from './imageUrl'

function peelMarkdownFence(content) {
  const trimmed = content.trim()
  if (!trimmed.startsWith('```')) return trimmed

  const labeled = trimmed.match(/^```(?:markdown|md)\s*\r?\n([\s\S]*?)(?:\r?\n)?```\s*$/i)
  if (labeled) return labeled[1].trim()

  const generic = trimmed.match(/^```[^\r\n]*\r?\n([\s\S]*?)(?:\r?\n)?```\s*$/)
  if (generic) return generic[1].trim()

  const openLabeled = trimmed.match(/^```(?:markdown|md)\s*\r?\n([\s\S]+)$/i)
  if (openLabeled) return openLabeled[1].replace(/\r?\n```\s*$/, '').trim()

  const openGeneric = trimmed.match(/^```[^\r\n]*\r?\n([\s\S]+)$/)
  if (openGeneric) return openGeneric[1].replace(/\r?\n```\s*$/, '').trim()

  return trimmed
}

function unwrapMarkdownFences(content) {
  let result = content.trim()

  for (let i = 0; i < 3; i += 1) {
    const next = peelMarkdownFence(result)
    if (next === result) break
    result = next
  }

  return result
}

function dedentIfFullyIndented(content) {
  const lines = content.split('\n')
  const nonEmpty = lines.filter((line) => line.trim().length > 0)

  if (!nonEmpty.length) return content

  const allIndented = nonEmpty.every((line) => /^ {4,}|\t/.test(line))
  if (!allIndented) return content

  return lines
    .map((line) => {
      if (!line.trim()) return ''
      return line.replace(/^(?: {4}|\t)/, '')
    })
    .join('\n')
}

function unescapeStoredNewlines(content) {
  if (!content.includes('\\n')) return content

  const literalCount = (content.match(/\\n/g) || []).length
  const actualCount = (content.match(/\n/g) || []).length
  if (literalCount <= actualCount) return content

  return content.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"')
}

function injectStandaloneImageUrls(content) {
  const lines = content.split('\n')
  let inFence = false

  return lines
    .map((line) => {
      const trimmed = line.trim()
      if (/^```/.test(trimmed)) {
        inFence = !inFence
        return line
      }
      if (inFence) return line
      if (/^https?:\/\/\S+$/i.test(trimmed) && isDisplayableImageUrl(trimmed)) {
        return `![](${trimmed})`
      }
      return line
    })
    .join('\n')
}

export function preprocessBlogMarkdown(content) {
  if (!content?.trim()) return ''

  let normalized = unescapeStoredNewlines(content)
  normalized = normalized.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  normalized = unwrapMarkdownFences(normalized)
  normalized = dedentIfFullyIndented(normalized)
  normalized = injectStandaloneImageUrls(normalized)

  return normalized.trim()
}

const normalizeHeading = (value = '') =>
  value
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

export function stripRedundantLessonHeading(content, courseTitle) {
  if (!content?.trim() || !courseTitle?.trim()) return content

  const lines = content.trim().split('\n')
  const firstLine = lines[0]?.trim() || ''
  const headingMatch = firstLine.match(/^#{1,2}\s+(.+)$/)
  if (!headingMatch) return content

  const heading = normalizeHeading(headingMatch[1])
  const course = normalizeHeading(courseTitle)
  if (!heading || !course) return content

  if (heading === course || heading.startsWith(course.slice(0, Math.min(course.length, 24)))) {
    return lines.slice(1).join('\n').trim()
  }

  return content
}
