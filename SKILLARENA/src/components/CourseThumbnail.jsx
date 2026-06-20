import BlogImage from './BlogImage'

const CourseThumbnail = ({
  src,
  alt = '',
  className = '',
  fallbackClassName = '',
  placeholderLabel = 'Course',
}) => {
  if (!src?.trim()) {
    return (
      <div className={`app-course-thumb app-course-thumb--placeholder ${fallbackClassName}`.trim()}>
        {placeholderLabel}
      </div>
    )
  }

  return (
    <div className={`course-thumbnail-wrap ${className}`.trim()}>
      <BlogImage
        src={src}
        alt={alt}
        className={`app-course-thumb ${className}`.trim()}
        fallbackClassName={`app-course-thumb app-course-thumb--placeholder ${fallbackClassName}`.trim()}
      />
    </div>
  )
}

export default CourseThumbnail
