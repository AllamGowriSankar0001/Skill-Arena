import { isDisplayableImageUrl } from './imageUrl'

function unwrapMarkdownFence(content) {
  const trimmed = content.trim()
  const match = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/)
  return match ? match[1].trim() : trimmed
}

function dedentIfFullyIndented(content) {
  const lines = content.split('\n')
  const nonEmpty = lines.filter((line) => line.trim().length > 0)

  if (!nonEmpty.length) return content

  const allIndented = nonEmpty.every((line) => /^ {4,}/.test(line))
  if (!allIndented) return content

  return lines
    .map((line) => {
      if (!line.trim()) return ''
      return line.replace(/^ {4}/, '')
    })
    .join('\n')
}

export function preprocessBlogMarkdown(content) {
  if (!content?.trim()) return ''

  let normalized = content.replace(/\r\n/g, '\n')
  normalized = unwrapMarkdownFence(normalized)
  normalized = dedentIfFullyIndented(normalized)

  return normalized
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim()
      if (!trimmed) return ''

      if (/^https?:\/\/\S+$/i.test(trimmed) && isDisplayableImageUrl(trimmed)) {
        return `![](${trimmed})`
      }

      return block.trim()
    })
    .join('\n\n')
}
