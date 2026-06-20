import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import BlogContent from '../components/BlogContent'
import BlogImage from '../components/BlogImage'
import { platformApi } from '../services/api'
import './Blog.css'

const formatDate = (value) => {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const estimateReadTime = (content) => {
  const words = String(content || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
  return Math.max(1, Math.ceil(words / 220))
}

const BlogPostPage = () => {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    platformApi
      .blog(slug)
      .then((data) => setPost(data.post))
      .catch((err) => setError(err.message || 'Failed to load blog post'))
      .finally(() => setLoading(false))
  }, [slug])

  const readTime = useMemo(() => estimateReadTime(post?.content), [post?.content])

  return (
    <main className="blog-post-page">
      <div className="blog-post-shell">
        {loading ? <p className="blog-status">Loading article…</p> : null}
        {error ? <p className="blog-error">{error}</p> : null}

        {post ? (
          <article className="blog-post">
            <div
              className={`blog-post-intro${post.coverImageUrl ? '' : ' blog-post-intro--no-image'}`}
            >
              <header className="blog-post-intro-text">
                <p className="blog-post-eyebrow">Skill Arena Blog</p>
                <h1 className="blog-post-title">{post.title}</h1>
                <p className="blog-post-excerpt">{post.excerpt}</p>

                <div className="blog-post-meta">
                  <span>{formatDate(post.publishedAt)}</span>
                  <span className="blog-post-meta-dot" aria-hidden="true">
                    •
                  </span>
                  <span>{post.authorName}</span>
                  <span className="blog-post-meta-dot" aria-hidden="true">
                    •
                  </span>
                  <span>{readTime} min read</span>
                </div>

                {post.tags?.length ? (
                  <div className="blog-tags blog-tags--post">
                    {post.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                ) : null}
              </header>

              {post.coverImageUrl ? (
                <div className="blog-post-intro-media">
                  <BlogImage
                    src={post.coverImageUrl}
                    alt={post.title}
                    className="blog-post-hero-image"
                    fallbackClassName="blog-post-hero-fallback"
                    loading="eager"
                  />
                </div>
              ) : null}
            </div>

            <div className="blog-post-body">
              <BlogContent content={post.content} />
            </div>
          </article>
        ) : null}
      </div>
    </main>
  )
}

export default BlogPostPage
