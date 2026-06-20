import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import BlogContent from '../../components/BlogContent'
import BlogImage from '../../components/BlogImage'
import { adminApi } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { ROUTES } from '../../routes'
import './AdminBlogPage.css'

const EMPTY_FORM = {
  title: '',
  excerpt: '',
  content: '',
  coverImageUrl: '',
  status: 'DRAFT',
  tags: '',
}

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DRAFT', label: 'Drafts' },
]

const EDITOR_TABS = [
  { id: 'write', label: 'Write' },
  { id: 'preview', label: 'Preview' },
]

const EXCERPT_MAX = 200

const postToForm = (post) => ({
  title: post.title || '',
  excerpt: post.excerpt || '',
  content: post.content || '',
  coverImageUrl: post.coverImageUrl || '',
  status: post.status || 'DRAFT',
  tags: (post.tags || []).join(', '),
})

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const parseTags = (value) =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

const countWords = (value) => {
  const trimmed = value.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

const AdminModal = ({ open, title, subtitle, onClose, children, footer, size = 'default' }) => {
  if (!open) return null

  const isEditor = size === 'editor'
  const sheetClass = [
    'admin-modal-sheet',
    size === 'editor'
      ? 'admin-modal-sheet--editor'
      : size === 'wide'
        ? 'admin-modal-sheet--wide'
        : size === 'narrow'
          ? 'admin-modal-sheet--narrow'
          : '',
  ]
    .filter(Boolean)
    .join(' ')

  return createPortal(
    <div
      className={`admin-modal-root${isEditor ? ' admin-modal-root--editor' : ''}`}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={sheetClass}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
        {footer ? <div className="admin-modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}

const BlogPostPreview = ({ form, authorName, compact = false }) => {
  const tags = parseTags(form.tags)

  return (
    <article className={`admin-blog-article-preview${compact ? ' admin-blog-article-preview--compact' : ''}`}>
      {form.coverImageUrl ? (
        <BlogImage
          src={form.coverImageUrl}
          alt=""
          className="admin-blog-article-cover"
          fallbackClassName="admin-blog-article-cover admin-blog-article-cover--placeholder"
        />
      ) : (
        <div className="admin-blog-article-cover admin-blog-article-cover--placeholder">Cover image</div>
      )}
      <div className="admin-blog-article-body">
        <p className="admin-blog-article-meta">
          {form.status === 'PUBLISHED' ? 'Published' : 'Draft'} • {authorName || 'Admin'}
        </p>
        <h3>{form.title.trim() || 'Untitled post'}</h3>
        <p className="admin-blog-article-excerpt">
          {form.excerpt.trim() || 'Add a short summary for the blog listing.'}
        </p>
        {tags.length ? (
          <div className="admin-blog-tags">
            {tags.map((tag) => (
              <span key={tag} className="admin-blog-tag">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <BlogContent content={form.content.trim() || 'Start writing your article content.'} />
      </div>
    </article>
  )
}

const PublishChecklist = ({ checks }) => (
  <ul className="admin-blog-checklist">
    {checks.map((check) => (
      <li
        key={check.label}
        className={`${check.done ? 'is-done' : ''}${check.required === false ? ' is-optional' : ''}`}
      >
        <span className="admin-blog-checklist-mark" aria-hidden="true">
          {check.done ? '✓' : '○'}
        </span>
        {check.label}
      </li>
    ))}
  </ul>
)

const AdminBlogPage = () => {
  const { showSuccess, showError } = useToast()
  const [posts, setPosts] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [modal, setModal] = useState('none')
  const [activePost, setActivePost] = useState(null)
  const [editingId, setEditingId] = useState('')
  const [editorTab, setEditorTab] = useState('write')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deletingId, setDeletingId] = useState('')

  const tags = useMemo(() => parseTags(form.tags), [form.tags])
  const wordCount = useMemo(() => countWords(form.content), [form.content])

  const publishChecks = useMemo(
    () => [
      { label: 'Title added', done: Boolean(form.title.trim()), required: true },
      { label: 'Summary added', done: Boolean(form.excerpt.trim()), required: true },
      { label: 'Article body written', done: Boolean(form.content.trim()), required: true },
      { label: 'Cover image linked (optional)', done: Boolean(form.coverImageUrl.trim()), required: false },
    ],
    [form.title, form.excerpt, form.content, form.coverImageUrl],
  )

  const canPublish = publishChecks.filter((check) => check.required).every((check) => check.done)

  const stats = useMemo(() => {
    const published = posts.filter((post) => post.status === 'PUBLISHED').length
    return {
      total: posts.length,
      published,
      draft: posts.length - published,
    }
  }, [posts])

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return posts.filter((post) => {
      const matchesStatus = statusFilter === 'ALL' || post.status === statusFilter
      if (!matchesStatus) return false
      if (!query) return true
      const haystack = [post.title, post.excerpt, post.authorName, ...(post.tags || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [posts, searchQuery, statusFilter])

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminApi.blogs()
      setPosts(data.posts)
    } catch (err) {
      showError(err.message || 'Failed to load blog posts')
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const closeEditor = () => {
    setModal('none')
    setActivePost(null)
    setEditingId('')
    setEditorTab('write')
    setForm(EMPTY_FORM)
  }

  const openEditor = (post = null, tab = 'write') => {
    setActivePost(post)
    setEditingId(post?.id || '')
    setForm(post ? postToForm(post) : EMPTY_FORM)
    setEditorTab(tab)
    setModal('editor')
  }

  const openDeleteModal = (post) => {
    setDeleteTarget(post)
    setModal('delete')
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const buildPayload = (overrides = {}) => ({
    title: form.title.trim(),
    excerpt: form.excerpt.trim(),
    content: form.content.trim(),
    coverImageUrl: form.coverImageUrl.trim(),
    status: form.status,
    tags: parseTags(form.tags),
    ...overrides,
  })

  const handleSubmit = async (event, overrides = {}) => {
    event?.preventDefault()

    const payload = buildPayload(overrides)
    if (payload.status === 'PUBLISHED' && !canPublish) {
      showError('Complete the publish checklist before going live.')
      setEditorTab('write')
      return
    }

    setSaving(true)

    try {
      if (editingId) {
        await adminApi.updateBlog(editingId, payload)
        showSuccess(payload.status === 'PUBLISHED' ? 'Blog post published.' : 'Blog post saved.')
      } else {
        await adminApi.createBlog(payload)
        showSuccess(payload.status === 'PUBLISHED' ? 'Blog post published.' : 'Draft created.')
      }
      closeEditor()
      await loadPosts()
    } catch (err) {
      showError(err.message || 'Failed to save blog post')
    } finally {
      setSaving(false)
    }
  }

  const handleQuickPublish = async (postId) => {
    try {
      await adminApi.updateBlog(postId, { status: 'PUBLISHED' })
      showSuccess('Blog post published.')
      await loadPosts()
    } catch (err) {
      showError(err.message || 'Failed to publish blog post')
    }
  }

  const handleQuickUnpublish = async (postId) => {
    try {
      await adminApi.updateBlog(postId, { status: 'DRAFT' })
      showSuccess('Blog post moved to draft.')
      await loadPosts()
    } catch (err) {
      showError(err.message || 'Failed to unpublish blog post')
    }
  }

  const handleDeletePost = async () => {
    if (!deleteTarget) return

    setDeletingId(deleteTarget.id)

    try {
      await adminApi.deleteBlog(deleteTarget.id)
      showSuccess(`"${deleteTarget.title}" was deleted.`)
      setDeleteTarget(null)
      setModal('none')
      await loadPosts()
    } catch (err) {
      showError(err.message || 'Failed to delete blog post')
    } finally {
      setDeletingId('')
    }
  }

  const isEditing = Boolean(editingId)
  const saveLabel = saving
    ? 'Saving…'
    : form.status === 'PUBLISHED'
      ? isEditing
        ? 'Save & publish'
        : 'Publish post'
      : isEditing
        ? 'Save draft'
        : 'Create draft'

  return (
    <div className="admin-page admin-blog-page">
      <div className="admin-blog-header">
        <div>
          <p className="admin-blog-eyebrow">Content management</p>
          <h1>Blog</h1>
          <p className="admin-page-lead">
            Write articles, preview how they look, and publish to the public Skill Arena blog.
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn--accent" onClick={() => openEditor()}>
          + New post
        </button>
      </div>

      {!loading ? (
        <div className="admin-blog-stats">
          <article className="admin-blog-stat admin-blog-stat--total">
            <span className="admin-blog-stat-label">Total posts</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="admin-blog-stat admin-blog-stat--published">
            <span className="admin-blog-stat-label">Published</span>
            <strong>{stats.published}</strong>
          </article>
          <article className="admin-blog-stat admin-blog-stat--draft">
            <span className="admin-blog-stat-label">Draft</span>
            <strong>{stats.draft}</strong>
          </article>
        </div>
      ) : null}

      {!loading && posts.length ? (
        <div className="admin-blog-toolbar">
          <label className="admin-blog-search">
            <span className="sr-only">Search blog posts</span>
            <input
              type="search"
              placeholder="Search by title, excerpt, tags, or author…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <div className="admin-blog-filters">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={`admin-blog-filter${statusFilter === filter.value ? ' is-active' : ''}`}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? <p className="admin-blog-loading">Loading posts…</p> : null}
      {!loading && !posts.length ? (
        <div className="admin-blog-empty">
          <h2>No blog posts yet</h2>
          <p>Write your first article and publish it to the public blog.</p>
          <button type="button" className="admin-btn admin-btn--accent" onClick={() => openEditor()}>
            Write your first post
          </button>
        </div>
      ) : null}
      {!loading && posts.length && !filteredPosts.length ? (
        <div className="admin-blog-empty admin-blog-empty--compact">
          <h2>No matches</h2>
          <p>Try a different search term or status filter.</p>
        </div>
      ) : null}

      <div className="admin-blog-grid">
        {filteredPosts.map((post) => (
          <article key={post.id} className="admin-blog-card">
            {post.coverImageUrl ? (
              <BlogImage
                src={post.coverImageUrl}
                alt=""
                className="admin-blog-card-cover"
                fallbackClassName="admin-blog-card-cover admin-blog-card-cover--placeholder"
              />
            ) : (
              <div className="admin-blog-card-cover admin-blog-card-cover--placeholder">No cover</div>
            )}
            <button type="button" className="admin-blog-card-main" onClick={() => openEditor(post, 'preview')}>
              <div className="admin-blog-card-top">
                <h2>{post.title}</h2>
                <span
                  className={`admin-badge${post.status === 'PUBLISHED' ? ' admin-badge--published' : ''}`}
                >
                  {post.status === 'PUBLISHED' ? 'Live' : 'Draft'}
                </span>
              </div>
              <p>{post.excerpt}</p>
              {post.tags?.length ? (
                <div className="admin-blog-tags">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="admin-blog-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <span className="admin-blog-meta">
                {post.authorName || 'Admin'} • Updated {formatDate(post.updatedAt)}
              </span>
            </button>
            <div className="admin-blog-card-actions">
              <button type="button" className="admin-btn admin-btn--compact" onClick={() => openEditor(post, 'write')}>
                Edit
              </button>
              {post.status === 'PUBLISHED' ? (
                <>
                  <Link to={`${ROUTES.blog}/${post.slug}`} className="admin-btn admin-btn--compact admin-btn--ghost">
                    View live
                  </Link>
                  <button
                    type="button"
                    className="admin-btn admin-btn--compact admin-btn--ghost"
                    onClick={() => handleQuickUnpublish(post.id)}
                  >
                    Unpublish
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="admin-btn admin-btn--compact admin-btn--accent"
                  onClick={() => handleQuickPublish(post.id)}
                >
                  Publish
                </button>
              )}
              <button
                type="button"
                className="admin-btn admin-btn--compact admin-btn--danger-outline"
                onClick={() => openDeleteModal(post)}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      <AdminModal
        open={modal === 'editor'}
        title={isEditing ? 'Edit blog post' : 'New blog post'}
        subtitle={
          editorTab === 'preview'
            ? 'Full article preview — switch to Write to keep editing.'
            : 'Set cover and publishing at the top, then write your article below.'
        }
        onClose={closeEditor}
        size="editor"
        footer={
          <div className="admin-blog-editor-footer">
            <p className="admin-blog-editor-hint">
              {editorTab === 'write'
                ? `${wordCount} words • ${tags.length} tag${tags.length === 1 ? '' : 's'}`
                : 'Review the article before publishing.'}
            </p>
            <div className="admin-blog-editor-footer-actions">
              <div className="admin-blog-editor-footer-secondary">
                <button type="button" className="admin-btn admin-btn--ghost" onClick={closeEditor} disabled={saving}>
                  Cancel
                </button>
              </div>
              <div className="admin-blog-editor-footer-primary">
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={(event) => handleSubmit(event, { status: 'DRAFT' })}
                  disabled={saving || !form.title.trim()}
                >
                  Save as draft
                </button>
                <button
                  type="submit"
                  form="blog-editor-form"
                  className="admin-btn admin-btn--accent"
                  disabled={saving || (form.status === 'PUBLISHED' && !canPublish)}
                >
                  {saveLabel}
                </button>
              </div>
            </div>
          </div>
        }
      >
        <div className="admin-blog-editor-toolbar">
          <div className="admin-blog-editor-tabs" role="tablist" aria-label="Editor views">
            {EDITOR_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={editorTab === tab.id}
                className={`admin-blog-editor-tab${editorTab === tab.id ? ' is-active' : ''}`}
                onClick={() => setEditorTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="admin-blog-editor-toolbar-end">
            {isEditing && activePost?.status === 'PUBLISHED' && activePost?.slug ? (
              <Link to={`${ROUTES.blog}/${activePost.slug}`} className="admin-blog-editor-live-link">
                View live ↗
              </Link>
            ) : null}
            <span
              className={`admin-blog-editor-status${form.status === 'PUBLISHED' ? ' is-live' : ''}`}
            >
              {form.status === 'PUBLISHED' ? 'Will publish live' : 'Draft'}
            </span>
          </div>
        </div>

        {editorTab === 'write' ? (
          <form id="blog-editor-form" className="admin-blog-editor-layout" onSubmit={handleSubmit}>
            <aside className="admin-blog-editor-settings">
              <div className="admin-blog-settings-block admin-blog-settings-block--cover">
                <h3>Cover</h3>
                {form.coverImageUrl.trim() ? (
                  <BlogImage
                    src={form.coverImageUrl.trim()}
                    alt=""
                    className="admin-blog-cover-preview admin-blog-cover-preview--stacked"
                    fallbackClassName="admin-blog-cover-preview admin-blog-cover-preview--empty admin-blog-cover-preview--stacked"
                  />
                ) : (
                  <div className="admin-blog-cover-preview admin-blog-cover-preview--empty admin-blog-cover-preview--stacked">
                    No cover
                  </div>
                )}
                <label className="admin-blog-field admin-blog-field--compact">
                  <span className="admin-blog-field-label">Image URL</span>
                  <input
                    name="coverImageUrl"
                    value={form.coverImageUrl}
                    onChange={handleChange}
                    placeholder="https://…"
                  />
                </label>
                {form.coverImageUrl ? (
                  <button
                    type="button"
                    className="admin-blog-link-btn"
                    onClick={() => setForm((current) => ({ ...current, coverImageUrl: '' }))}
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="admin-blog-settings-block admin-blog-settings-block--publish">
                <h3>Publishing</h3>
                <label className="admin-blog-field admin-blog-field--compact">
                  <span className="admin-blog-field-label">Visibility</span>
                  <select name="status" value={form.status} onChange={handleChange}>
                    <option value="DRAFT">Draft — hidden</option>
                    <option value="PUBLISHED">Published — live</option>
                  </select>
                </label>
                <label className="admin-blog-field admin-blog-field--compact">
                  <span className="admin-blog-field-label">Tags</span>
                  <input
                    name="tags"
                    value={form.tags}
                    onChange={handleChange}
                    placeholder="learning, battles, updates"
                  />
                </label>
                {tags.length ? (
                  <div className="admin-blog-tags admin-blog-tags--aside">
                    {tags.map((tag) => (
                      <span key={tag} className="admin-blog-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="admin-blog-settings-block admin-blog-settings-block--checklist">
                <h3>Ready to publish?</h3>
                <PublishChecklist checks={publishChecks} />
              </div>
            </aside>

            <section className="admin-blog-editor-meta">
              <label className="admin-blog-field admin-blog-field--title">
                <span className="admin-blog-field-label">
                  Title
                  <span className="admin-blog-field-count">{form.title.length} chars</span>
                </span>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  placeholder="Give your article a clear headline"
                  autoFocus
                />
              </label>

              <label
                className={`admin-blog-field admin-blog-field--excerpt${form.excerpt.length > EXCERPT_MAX ? ' is-over-limit' : ''}`}
              >
                <span className="admin-blog-field-label">
                  Short summary
                  <span
                    className={`admin-blog-field-count${form.excerpt.length > EXCERPT_MAX ? ' is-over' : ''}`}
                  >
                    {form.excerpt.length}/{EXCERPT_MAX}
                  </span>
                </span>
                <textarea
                  name="excerpt"
                  value={form.excerpt}
                  onChange={handleChange}
                  required
                  rows={2}
                  placeholder="A brief description shown on the blog listing page"
                />
                {form.excerpt.length > EXCERPT_MAX ? (
                  <span className="admin-blog-field-error">Keep the summary to {EXCERPT_MAX} characters or less.</span>
                ) : null}
              </label>
            </section>

            <section className="admin-blog-editor-content" aria-label="Article content">
              <div className="admin-blog-editor-pane-header">
                <span>Markdown</span>
                <span>{wordCount} words</span>
              </div>
              <textarea
                name="content"
                value={form.content}
                onChange={handleChange}
                required
                className="admin-blog-content-input"
                placeholder={'# Heading\n\nWrite in Markdown — **bold**, lists, links, and ![images](url).'}
                aria-label="Article body"
              />
            </section>
          </form>
        ) : (
          <BlogPostPreview form={form} authorName={activePost?.authorName} />
        )}
      </AdminModal>

      <AdminModal
        open={modal === 'delete' && Boolean(deleteTarget)}
        title="Delete blog post"
        subtitle="This action cannot be undone."
        onClose={() => {
          setDeleteTarget(null)
          setModal('none')
        }}
        size="narrow"
        footer={
          <div className="admin-modal-action-row">
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={() => {
                setDeleteTarget(null)
                setModal('none')
              }}
              disabled={Boolean(deletingId)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--danger"
              onClick={handleDeletePost}
              disabled={Boolean(deletingId)}
            >
              {deletingId ? 'Deleting…' : 'Delete post'}
            </button>
          </div>
        }
      >
        <p className="admin-delete-copy">
          Delete <strong>{deleteTarget?.title}</strong>? It will be removed from the admin list
          {deleteTarget?.status === 'PUBLISHED' ? ' and will no longer appear on the public blog' : ''}.
        </p>
      </AdminModal>
    </div>
  )
}

export default AdminBlogPage
