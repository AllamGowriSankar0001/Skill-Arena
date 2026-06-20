import { useEffect, useMemo, useState } from 'react'
import { resolveImageUrl } from '../utils/imageUrl'

const BlogImage = ({
  src,
  alt = '',
  className = '',
  loading = 'lazy',
  fallbackClassName = '',
}) => {
  const resolved = useMemo(() => resolveImageUrl(src), [src])
  const [activeSrc, setActiveSrc] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setActiveSrc(resolved?.displayUrl || src || '')
    setFailed(false)
  }, [resolved, src])

  const handleError = () => {
    if (resolved?.provider === 'google-drive' && activeSrc !== resolved.thumbnailUrl) {
      setActiveSrc(resolved.thumbnailUrl)
      return
    }

    setFailed(true)
  }

  if (!src?.trim()) return null

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

  return (
    <img
      src={activeSrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={handleError}
    />
  )
}

export default BlogImage
