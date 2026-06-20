import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BlogImage from '../components/BlogImage'
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

const BlogPage = () => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    platformApi
      .blogs()
      .then((data) => setPosts(data.posts))
      .catch((err) => setError(err.message || 'Failed to load blog posts'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageShell
      eyebrow="Company"
      title="Blog"
      description="Product updates, learning tips, community highlights, and stories from inside the arena."
      showBackLink={false}
    >
      {loading ? <p className="blog-status">Loading posts…</p> : null}
      {error ? <p className="blog-error">{error}</p> : null}

      {!loading && !error && !posts.length ? (
        <p className="blog-status">No published posts yet. Check back soon.</p>
      ) : null}

      <div className="blog-grid">
        {posts.map((post) => (
          <Link key={post.id} to={`${ROUTES.blog}/${post.slug}`} className="blog-card">
            {post.coverImageUrl ? (
              <div className="blog-card-cover-wrap">
                <BlogImage
                  src={post.coverImageUrl}
                  alt={post.title}
                  className="blog-card-cover"
                  fallbackClassName="blog-card-cover-fallback"
                />
              </div>
            ) : (
              <div className="blog-card-cover blog-card-cover--placeholder">✦</div>
            )}
            <div className="blog-card-body">
              <p className="blog-card-date">{formatDate(post.publishedAt)}</p>
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              {post.tags?.length ? (
                <div className="blog-tags">
                  {post.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </PageShell>
  )
}

export default BlogPage
