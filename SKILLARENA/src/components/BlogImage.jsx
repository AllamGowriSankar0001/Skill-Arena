import { useEffect, useMemo, useState } from 'react'
import { resolveImageUrl } from '../utils/imageUrl'

const BlogImage = ({
  src,
  alt = '',
  className = '',
  loading = 'lazy',
  fallbackClassName = '',
}) => {
  const trimmedSrc = String(src || '').trim()
  const resolved = useMemo(() => resolveImageUrl(trimmedSrc), [trimmedSrc])
  const [activeSrc, setActiveSrc] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setActiveSrc(resolved?.displayUrl || trimmedSrc)
    setFailed(false)
  }, [resolved, trimmedSrc])

  const handleError = () => {
    if (resolved?.provider === 'google-drive') {
      if (activeSrc !== resolved.viewUrl) {
        setActiveSrc(resolved.viewUrl)
        return
      }
      if (activeSrc !== resolved.thumbnailUrl) {
        setActiveSrc(resolved.thumbnailUrl)
        return
      }
    }

    setFailed(true)
  }

  if (!trimmedSrc) return null

  if (failed && resolved?.provider === 'google-drive') {
    return (
      <div className={`blog-image-fallback ${fallbackClassName}`.trim()}>
        <iframe
          src={resolved.previewUrl}
          title={alt || 'Google Drive image preview'}
          loading={loading}
          allow="autoplay"
        />
      </div>
    )
  }

  if (failed) {
    return (
      <div className={`blog-image-fallback blog-image-fallback--broken ${fallbackClassName}`.trim()}>
        <span>Image unavailable</span>
      </div>
    )
  }

  const displaySrc = activeSrc || resolved?.displayUrl || trimmedSrc
  if (!displaySrc) {
    return (
      <div className={`blog-image-fallback blog-image-fallback--broken ${fallbackClassName}`.trim()}>
        <span>Image unavailable</span>
      </div>
    )
  }

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={handleError}
    />
  )
}

export default BlogImage
