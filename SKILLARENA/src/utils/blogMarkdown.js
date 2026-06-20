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

export function preprocessBlogMarkdown(content) {
  if (!content?.trim()) return ''

  let normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  normalized = unwrapMarkdownFences(normalized)
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
