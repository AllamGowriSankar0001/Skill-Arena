import { useMemo } from 'react'
import { parseVideoEmbed } from '../utils/videoEmbed'
import './VideoEmbed.css'

export function VideoEmbed({ url, title = 'Video lesson' }) {
  const embed = useMemo(() => parseVideoEmbed(url), [url])

  if (!url?.trim()) return null

  if (!embed) {
    return (
      <div className="video-embed-fallback">
        <p>This video link cannot be embedded. Open it in a new tab to watch.</p>
        <a href={url.trim()} target="_blank" rel="noopener noreferrer">
          Open video
        </a>
      </div>
    )
  }

  if (embed.provider === 'direct') {
    return (
      <div className="video-embed">
        <video controls playsInline src={embed.embedUrl} title={title} />
      </div>
    )
  }

  return (
    <div className="video-embed">
      <iframe
        src={embed.embedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  )
}

export default VideoEmbed
