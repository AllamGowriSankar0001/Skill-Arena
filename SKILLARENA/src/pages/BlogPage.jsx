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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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
              <BlogImage
                src={post.coverImageUrl}
                alt={post.title}
                className="blog-card-cover"
                fallbackClassName="blog-card-cover blog-card-cover--placeholder"
              />
            ) : (
              <div className="blog-card-cover blog-card-cover--placeholder">No cover</div>
            )}

            <div className="blog-card-body">
              <h2>{post.title}</h2>

              <p className="blog-card-excerpt">{post.excerpt}</p>

              {post.tags?.length ? (
                <div className="blog-tags blog-tags--card">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="blog-tag">
                      {tag}
                    </span>
                  ))}
                  {post.tags.length > 3 ? (
                    <span className="blog-tag blog-tag--more">+{post.tags.length - 3}</span>
                  ) : null}
                </div>
              ) : null}

              <p className="blog-card-meta">
                {post.authorName || 'Skill Arena'} • Updated {formatDate(post.updatedAt || post.publishedAt)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </PageShell>
  )
}

export default BlogPage
