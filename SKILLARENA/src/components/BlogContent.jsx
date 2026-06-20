import { useMemo } from 'react'
import BlogImage from './BlogImage'
import { parseBlogContent } from '../utils/imageUrl'

const BlogContent = ({ content }) => {
  const blocks = useMemo(() => parseBlogContent(content), [content])

  if (!blocks.length) {
    return <p className="blog-article-empty">No content yet.</p>
  }

  return (
    <div className="blog-article-content">
      {blocks.map((block, index) => {
        if (block.type === 'image') {
          return (
            <figure key={`image-${index}`} className="blog-article-figure">
              <BlogImage
                src={block.url}
                alt={block.alt || 'Blog image'}
                className="blog-article-inline-image"
                fallbackClassName="blog-article-inline-fallback"
              />
              {block.alt ? <figcaption>{block.alt}</figcaption> : null}
            </figure>
          )
        }

        return (
          <p key={`text-${index}`} className="blog-article-paragraph">
            {block.text}
          </p>
        )
      })}
    </div>
  )
}

export default BlogContent
