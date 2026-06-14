import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../../services/api'
import { ROUTES } from '../../routes'
import { formatContactLine } from '../../utils/resumeStructured'
import { parseSkillItemsFromSections } from '../../utils/resumeSkills'
import './AdminResumesPage.css'

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const getResumeStats = (resume) => {
  const experiences = resume.experiences?.filter((item) => item.role || item.company) || []
  const projects = resume.projects?.filter((item) => item.name) || []
  const educations = resume.educations?.filter((item) => item.degree || item.institution) || []
  const skills = parseSkillItemsFromSections(resume.sections || [])
  return {
    experiences: experiences.length,
    projects: projects.length,
    educations: educations.length,
    skills: skills.length,
  }
}

const AdminModal = ({ open, title, subtitle, onClose, children, footer, size = 'default' }) => {
  if (!open) return null

  return (
    <div className="admin-modal-root" role="presentation" onClick={onClose}>
      <div
        className={`admin-modal-sheet${size === 'narrow' ? ' admin-modal-sheet--narrow' : ''}`}
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
    </div>
  )
}

const AdminResumesPage = () => {
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeResume, setActiveResume] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deletingId, setDeletingId] = useState('')
  const [modal, setModal] = useState('none')

  const stats = useMemo(() => {
    const uniqueUsers = new Set(resumes.map((resume) => resume.userId).filter(Boolean))
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const recent = resumes.filter((resume) => new Date(resume.updatedAt).getTime() >= weekAgo).length
    return {
      total: resumes.length,
      users: uniqueUsers.size,
      recent,
    }
  }, [resumes])

  const filteredResumes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return resumes
    return resumes.filter((resume) => {
      const haystack = [
        resume.userName,
        resume.userEmail,
        resume.name,
        resume.role,
        resume.title,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [resumes, searchQuery])

  const loadResumes = useCallback(() => {
    setLoading(true)
    setError('')
    adminApi
      .resumes()
      .then((data) => setResumes(data.resumes))
      .catch((err) => setError(err.message || 'Failed to load resumes'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadResumes()
  }, [loadResumes])

  useEffect(() => {
    if (!message) return undefined
    const timer = window.setTimeout(() => setMessage(''), 4000)
    return () => window.clearTimeout(timer)
  }, [message])

  const closeModal = () => {
    setModal('none')
    setActiveResume(null)
    setDeleteTarget(null)
  }

  const openViewModal = (resume) => {
    setActiveResume(resume)
    setModal('view')
  }

  const openDeleteModal = (resume) => {
    setDeleteTarget(resume)
    setModal('delete')
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    setError('')
    try {
      await adminApi.deleteResume(deleteTarget.id)
      setResumes((current) => current.filter((item) => item.id !== deleteTarget.id))
      setMessage(`Resume for ${deleteTarget.userName || deleteTarget.userEmail || 'user'} deleted.`)
      closeModal()
    } catch (err) {
      setError(err.message || 'Failed to delete resume')
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div className="admin-page admin-resumes-page">
      <div className="admin-resumes-header">
        <div>
          <p className="admin-resumes-eyebrow">Resume management</p>
          <h1>User resumes</h1>
          <p className="admin-page-lead">
            Review resumes saved by learners, inspect details, and remove outdated records.
          </p>
        </div>
        <div className="admin-resumes-header-actions">
          <Link to={ROUTES.adminResume} className="admin-btn admin-btn--accent">
            Open AI resume maker
          </Link>
        </div>
      </div>

      {error ? (
        <div className="admin-resumes-alert admin-resumes-alert--error" role="alert">
          {error}
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
            ✕
          </button>
        </div>
      ) : null}
      {message ? (
        <div className="admin-resumes-alert admin-resumes-alert--success" role="status">
          {message}
        </div>
      ) : null}

      {!loading ? (
        <div className="admin-resumes-stats">
          <article className="admin-resumes-stat admin-resumes-stat--total">
            <span className="admin-resumes-stat-label">Total resumes</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="admin-resumes-stat admin-resumes-stat--users">
            <span className="admin-resumes-stat-label">Unique users</span>
            <strong>{stats.users}</strong>
          </article>
          <article className="admin-resumes-stat admin-resumes-stat--recent">
            <span className="admin-resumes-stat-label">Updated this week</span>
            <strong>{stats.recent}</strong>
          </article>
        </div>
      ) : null}

      {!loading && resumes.length ? (
        <div className="admin-resumes-toolbar">
          <label className="admin-resumes-search">
            <span className="sr-only">Search resumes</span>
            <input
              type="search"
              placeholder="Search by user, email, name, or headline…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
        </div>
      ) : null}

      {loading ? <p className="admin-resumes-loading">Loading resumes…</p> : null}
      {!loading && !resumes.length ? (
        <div className="admin-resumes-empty">
          <h2>No saved resumes yet</h2>
          <p>When learners build and save resumes, they will appear here for review.</p>
          <Link to={ROUTES.adminResume} className="admin-btn admin-btn--accent">
            Test the AI resume maker
          </Link>
        </div>
      ) : null}
      {!loading && resumes.length && !filteredResumes.length ? (
        <div className="admin-resumes-empty admin-resumes-empty--compact">
          <h2>No matches</h2>
          <p>Try a different search term.</p>
        </div>
      ) : null}

      <div className="admin-resumes-grid">
        {filteredResumes.map((resume) => {
          const counts = getResumeStats(resume)
          return (
            <article key={resume.id} className="admin-resume-card">
              <button
                type="button"
                className="admin-resume-card-main"
                onClick={() => openViewModal(resume)}
              >
                <div className="admin-resume-card-top">
                  <div>
                    <span className="admin-resume-user">{resume.userName || 'User'}</span>
                    <h2>{resume.name || resume.title || 'Untitled resume'}</h2>
                  </div>
                </div>
                <p>{resume.role || 'No headline yet'}</p>
                <p>{resume.userEmail || 'No email on file'}</p>
                <div className="admin-resume-meta">
                  <span>{counts.experiences} roles</span>
                  <span>{counts.projects} projects</span>
                  <span>{counts.skills} skills</span>
                  <span>Updated {formatDate(resume.updatedAt)}</span>
                </div>
              </button>
              <div className="admin-resume-card-actions">
                <button type="button" className="admin-link-btn" onClick={() => openViewModal(resume)}>
                  View
                </button>
                <button
                  type="button"
                  className="admin-link-btn admin-link-btn--danger"
                  onClick={() => openDeleteModal(resume)}
                >
                  Delete
                </button>
              </div>
            </article>
          )
        })}
      </div>

      <AdminModal
        open={modal === 'view' && Boolean(activeResume)}
        title={activeResume?.name || activeResume?.title || 'Resume details'}
        subtitle={activeResume?.role || 'Saved learner resume'}
        onClose={closeModal}
        footer={
          activeResume ? (
            <div className="admin-modal-action-row">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={closeModal}>
                Close
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--danger"
                onClick={() => {
                  setDeleteTarget(activeResume)
                  setModal('delete')
                }}
              >
                Delete resume
              </button>
            </div>
          ) : null
        }
      >
        {activeResume ? (
          <>
            <div className="admin-resume-detail-grid">
              <div className="admin-resume-detail-item">
                <span>User</span>
                <strong>{activeResume.userName || '—'}</strong>
              </div>
              <div className="admin-resume-detail-item">
                <span>Email</span>
                <strong>{activeResume.userEmail || '—'}</strong>
              </div>
              <div className="admin-resume-detail-item">
                <span>Headline</span>
                <strong>{activeResume.role || '—'}</strong>
              </div>
              <div className="admin-resume-detail-item">
                <span>Last updated</span>
                <strong>{formatDate(activeResume.updatedAt)}</strong>
              </div>
            </div>
            <div className="admin-resume-detail-block">
              <h3>Contact</h3>
              <p>{formatContactLine(activeResume.contact) || 'No contact details saved.'}</p>
            </div>
            <div className="admin-resume-detail-grid">
              <div className="admin-resume-detail-item">
                <span>Experience entries</span>
                <strong>{getResumeStats(activeResume).experiences}</strong>
              </div>
              <div className="admin-resume-detail-item">
                <span>Projects</span>
                <strong>{getResumeStats(activeResume).projects}</strong>
              </div>
              <div className="admin-resume-detail-item">
                <span>Education entries</span>
                <strong>{getResumeStats(activeResume).educations}</strong>
              </div>
              <div className="admin-resume-detail-item">
                <span>Skills</span>
                <strong>{getResumeStats(activeResume).skills}</strong>
              </div>
            </div>
          </>
        ) : null}
      </AdminModal>

      <AdminModal
        open={modal === 'delete' && Boolean(deleteTarget)}
        title="Delete resume"
        subtitle="This action cannot be undone."
        onClose={closeModal}
        size="narrow"
        footer={
          <div className="admin-modal-action-row">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={closeModal} disabled={deletingId}>
              Cancel
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--danger"
              onClick={handleDelete}
              disabled={deletingId}
            >
              {deletingId ? 'Deleting…' : 'Delete resume'}
            </button>
          </div>
        }
      >
        <p className="admin-delete-copy">
          Delete resume for <strong>{deleteTarget?.userName || deleteTarget?.userEmail || 'this user'}</strong>?
          The saved resume data will be permanently removed.
        </p>
      </AdminModal>
    </div>
  )
}

export default AdminResumesPage
