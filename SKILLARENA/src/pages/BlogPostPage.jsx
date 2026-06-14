import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageShell from './PageShell'
import { platformApi } from '../services/api'
import { ROUTES } from '../routes'
import './Blog.css'

const formatDate = (value) => {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const BlogPostPage = () => {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    platformApi
      .blog(slug)
      .then((data) => setPost(data.post))
      .catch((err) => setError(err.message || 'Failed to load blog post'))
      .finally(() => setLoading(false))
  }, [slug])

  return (
    <PageShell
      eyebrow="Blog"
      title={post?.title || 'Article'}
      description={post?.excerpt || 'Loading article…'}
    >
      <Link to={ROUTES.blog} className="blog-back">
        ← Back to blog
      </Link>

      {loading ? <p className="blog-status">Loading article…</p> : null}
      {error ? <p className="blog-error">{error}</p> : null}

      {post ? (
        <article className="blog-article">
          <p className="blog-article-meta">
            {formatDate(post.publishedAt)} • {post.authorName}
          </p>
          {post.coverImageUrl ? (
            <img src={post.coverImageUrl} alt="" className="blog-article-cover" />
          ) : null}
          {post.tags?.length ? (
            <div className="blog-tags">
              {post.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          ) : null}
          <div className="blog-article-content">{post.content}</div>
        </article>
      ) : null}
    </PageShell>
  )
}

export default BlogPostPage
