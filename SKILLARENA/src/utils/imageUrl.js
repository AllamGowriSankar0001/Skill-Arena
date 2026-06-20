const DRIVE_FILE_PATTERN = /drive\.google\.com\/file\/d\/([^/?]+)/
const DRIVE_OPEN_PATTERN = /drive\.google\.com\/open\?id=([^&]+)/
const DRIVE_UC_PATTERN = /drive\.google\.com\/uc\?[^#]*id=([^&]+)/
const DRIVE_PREVIEW_PATTERN = /drive\.google\.com\/file\/d\/([^/?]+)\/preview/
const GDRIVE_USERCONTENT_PATTERN = /lh3\.googleusercontent\.com\/d\/([^/?]+)/
const IMAGE_EXTENSION_PATTERN = /\.(avif|bmp|gif|jpe?g|png|svg|webp)(\?.*)?$/i

export function extractDriveFileId(url) {
  if (!url) return null

  const trimmed = String(url).trim()
  const patterns = [
    DRIVE_FILE_PATTERN,
    DRIVE_OPEN_PATTERN,
    DRIVE_UC_PATTERN,
    DRIVE_PREVIEW_PATTERN,
    GDRIVE_USERCONTENT_PATTERN,
  ]

  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    if (match?.[1]) return match[1]
  }

  return null
}

export function buildDriveImageUrls(fileId) {
  return {
    viewUrl: `https://drive.google.com/uc?export=view&id=${fileId}`,
    thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
    previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
  }
}

export function resolveImageUrl(url) {
  if (!url) return null

  const trimmed = String(url).trim()
  if (!trimmed) return null

  const driveId = extractDriveFileId(trimmed)
  if (driveId) {
    const driveUrls = buildDriveImageUrls(driveId)
    return {
      provider: 'google-drive',
      originalUrl: trimmed,
      ...driveUrls,
      displayUrl: driveUrls.viewUrl,
    }
  }

  if (IMAGE_EXTENSION_PATTERN.test(trimmed) || trimmed.startsWith('data:image/')) {
    return {
      provider: 'direct',
      originalUrl: trimmed,
      displayUrl: trimmed,
      viewUrl: trimmed,
      thumbnailUrl: trimmed,
      previewUrl: trimmed,
    }
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return {
      provider: 'remote',
      originalUrl: trimmed,
      displayUrl: trimmed,
      viewUrl: trimmed,
      thumbnailUrl: trimmed,
      previewUrl: trimmed,
    }
  }

  return null
}

export function isDisplayableImageUrl(url) {
  return Boolean(resolveImageUrl(url))
}

export function parseBlogContent(content) {
  if (!content?.trim()) return []

  return content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const markdownImage = block.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
      if (markdownImage) {
        return {
          type: 'image',
          alt: markdownImage[1],
          url: markdownImage[2].trim(),
        }
      }

      if (/^https?:\/\/\S+$/i.test(block) && isDisplayableImageUrl(block)) {
        return {
          type: 'image',
          alt: '',
          url: block,
        }
      }

      return {
        type: 'text',
        text: block,
      }
    })
}
