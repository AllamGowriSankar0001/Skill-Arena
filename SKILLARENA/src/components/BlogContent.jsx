import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import BlogImage from './BlogImage'
import { preprocessBlogMarkdown, stripRedundantLessonHeading } from '../utils/blogMarkdown'
import '../pages/Blog.css'

const markdownComponents = {
  h1: ({ children }) => <h1 className="blog-md-h1">{children}</h1>,
  h2: ({ children }) => <h2 className="blog-md-h2">{children}</h2>,
  h3: ({ children }) => <h3 className="blog-md-h3">{children}</h3>,
  h4: ({ children }) => <h4 className="blog-md-h4">{children}</h4>,
  hr: () => <hr className="blog-md-hr" />,
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
  pre: ({ children }) => <pre>{children}</pre>,
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className)
    if (isBlock) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      )
    }
    return <code {...props}>{children}</code>
  },
}

const BlogContent = ({ content, courseTitle }) => {
  const markdown = useMemo(() => {
    const stripped = courseTitle ? stripRedundantLessonHeading(content, courseTitle) : content
    return preprocessBlogMarkdown(stripped)
  }, [content, courseTitle])

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
