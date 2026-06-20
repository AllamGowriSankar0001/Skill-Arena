import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import BlogImage from './BlogImage'
import { preprocessBlogMarkdown } from '../utils/blogMarkdown'
import '../pages/Blog.css'

const markdownComponents = {
  img: ({ src, alt }) => (
    <figure className="blog-article-figure">
      <BlogImage
        src={src}
        alt={alt || 'Blog image'}
        className="blog-article-inline-image"
        fallbackClassName="blog-article-inline-fallback"
      />
      {alt ? <figcaption>{alt}</figcaption> : null}
    </figure>
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  p: ({ children }) => <p className="blog-article-paragraph">{children}</p>,
}

const BlogContent = ({ content }) => {
  const markdown = useMemo(() => preprocessBlogMarkdown(content), [content])

  if (!markdown.trim()) {
    return <p className="blog-article-empty">No content yet.</p>
  }

  return (
    <div className="blog-article-content blog-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {markdown}
      </ReactMarkdown>
    </div>
  )
}

export default BlogContent
