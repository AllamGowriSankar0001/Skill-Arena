export function parseVideoEmbed(url) {
  if (!url) return null

  const trimmed = String(url).trim()
  if (!trimmed) return null

  const youtubeMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  )
  if (youtubeMatch) {
    return {
      provider: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`,
      originalUrl: trimmed,
    }
  }

  const driveFileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/?]+)/)
  if (driveFileMatch) {
    return {
      provider: 'google-drive',
      embedUrl: `https://drive.google.com/file/d/${driveFileMatch[1]}/preview`,
      originalUrl: trimmed,
    }
  }

  const driveOpenMatch = trimmed.match(/drive\.google\.com\/open\?id=([^&]+)/)
  if (driveOpenMatch) {
    return {
      provider: 'google-drive',
      embedUrl: `https://drive.google.com/file/d/${driveOpenMatch[1]}/preview`,
      originalUrl: trimmed,
    }
  }

  if (/\.(mp4|webm|ogg)(\?|$)/i.test(trimmed)) {
    return {
      provider: 'direct',
      embedUrl: trimmed,
      originalUrl: trimmed,
    }
  }

  return null
}
