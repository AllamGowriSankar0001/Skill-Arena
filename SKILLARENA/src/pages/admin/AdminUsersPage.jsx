import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { adminApi } from '../../services/api'
import { ROUTES } from '../../routes'
import './AdminUsersPage.css'

const ROLE_FILTERS = [
  { value: 'ALL', label: 'All roles' },
  { value: 'STUDENT', label: 'Students' },
  { value: 'MENTOR', label: 'Mentors' },
  { value: 'ADMIN', label: 'Admins' },
]

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'BLOCKED', label: 'Blocked' },
]

const ROLE_OPTIONS = ['STUDENT', 'MENTOR', 'ADMIN']
const STATUS_OPTIONS = ['ACTIVE', 'BLOCKED', 'DELETED']

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatDateTime = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const getInitials = (name) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

const AdminModal = ({ open, title, subtitle, onClose, children, footer, size = 'default' }) => {
  if (!open) return null

  const sizeClass =
    size === 'wide' ? ' admin-modal-sheet--wide' : size === 'narrow' ? ' admin-modal-sheet--narrow' : ''

  return (
    <div className="admin-modal-root" role="presentation" onClick={onClose}>
      <div
        className={`admin-modal-sheet${sizeClass}`}
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

const AdminUsersPage = () => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const [modal, setModal] = useState('none')
  const [activeUser, setActiveUser] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deletingId, setDeletingId] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', role: 'STUDENT', status: 'ACTIVE' })
  const [xpHistory, setXpHistory] = useState(null)
  const [xpLoading, setXpLoading] = useState(false)
  const [xpError, setXpError] = useState('')

  const stats = useMemo(() => {
    const active = users.filter((user) => user.status === 'ACTIVE').length
    const blocked = users.filter((user) => user.status === 'BLOCKED').length
    const students = users.filter((user) => user.role === 'STUDENT').length
    const mentors = users.filter((user) => user.role === 'MENTOR').length
    const admins = users.filter((user) => user.role === 'ADMIN').length
    return {
      total: users.length,
      active,
      blocked,
      students,
      mentors,
      admins,
    }
  }, [users])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminApi.users({
        search: searchQuery.trim() || undefined,
        role: roleFilter,
        status: statusFilter,
      })
      setUsers(data.users)
    } catch (err) {
      setError(err.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, roleFilter, statusFilter])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadUsers()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [loadUsers])

  useEffect(() => {
    if (!message) return undefined
    const timer = window.setTimeout(() => setMessage(''), 4000)
    return () => window.clearTimeout(timer)
  }, [message])

  const openUserModal = async (userSummary) => {
    setModal('detail')
    setActiveUser(userSummary)
    setEditForm({
      name: userSummary.name,
      role: userSummary.role,
      status: userSummary.status,
    })
    setDetailLoading(true)
    setError('')

    try {
      const data = await adminApi.user(userSummary.id)
      setActiveUser(data.user)
      setEditForm({
        name: data.user.name,
        role: data.user.role,
        status: data.user.status,
      })
    } catch (err) {
      setError(err.message || 'Failed to load user details')
    } finally {
      setDetailLoading(false)
    }
  }

  const closeUserModal = () => {
    setModal('none')
    setActiveUser(null)
    setDetailLoading(false)
    setXpHistory(null)
    setXpError('')
  }

  const openXpHistoryModal = async () => {
    if (!activeUser?.id || activeUser.role === 'ADMIN') return

    setModal('xp')
    setXpLoading(true)
    setXpError('')
    setXpHistory(null)

    try {
      const data = await adminApi.userXpHistory(activeUser.id)
      setXpHistory(data)
    } catch (err) {
      setXpError(err.message || 'Failed to load XP history')
    } finally {
      setXpLoading(false)
    }
  }

  const closeXpHistoryModal = () => {
    setModal('detail')
    setXpHistory(null)
    setXpError('')
  }

  const openDeleteModal = (user) => {
    setDeleteTarget(user)
    setModal('delete')
  }

  const handleDeleteUser = async () => {
    if (!deleteTarget) return

    setDeletingId(deleteTarget.id)
    setError('')
    setMessage('')

    try {
      await adminApi.deleteUser(deleteTarget.id)
      setMessage(`"${deleteTarget.name}" was deleted.`)
      setDeleteTarget(null)
      setActiveUser(null)
      setModal('none')
      await loadUsers()
    } catch (err) {
      setError(err.message || 'Failed to delete user')
    } finally {
      setDeletingId('')
    }
  }

  const handleSaveUser = async (overrides = {}) => {
    if (!activeUser) return

    setSaving(true)
    setError('')
    setMessage('')

    const payload = {
      name: editForm.name.trim(),
      role: editForm.role,
      status: editForm.status,
      ...overrides,
    }

    try {
      const data = await adminApi.updateUser(activeUser.id, payload)
      setMessage(`Updated ${data.user.name}.`)
      closeUserModal()
      await loadUsers()
    } catch (err) {
      setError(err.message || 'Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const isSelf = activeUser?.id === currentUser?.id
  const canDeleteUser =
    activeUser && !isSelf && activeUser.role !== 'ADMIN' && activeUser.status !== 'DELETED'

  return (
    <div className="admin-page admin-users-page">
      <div className="admin-users-header">
        <div>
          <p className="admin-users-eyebrow">Community management</p>
          <h1>Users</h1>
          <p className="admin-page-lead">
            View accounts, change roles, and block users who should not access Skill Arena.
          </p>
        </div>
      </div>

      {error ? (
        <div className="admin-users-alert admin-users-alert--error" role="alert">
          {error}
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
            ✕
          </button>
        </div>
      ) : null}
      {message ? (
        <div className="admin-users-alert admin-users-alert--success" role="status">
          {message}
        </div>
      ) : null}

      {!loading ? (
        <div className="admin-users-stats">
          <article className="admin-users-stat admin-users-stat--total">
            <span className="admin-users-stat-label">Total users</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="admin-users-stat admin-users-stat--active">
            <span className="admin-users-stat-label">Active</span>
            <strong>{stats.active}</strong>
          </article>
          <article className="admin-users-stat admin-users-stat--blocked">
            <span className="admin-users-stat-label">Blocked</span>
            <strong>{stats.blocked}</strong>
          </article>
          <article className="admin-users-stat admin-users-stat--students">
            <span className="admin-users-stat-label">Students</span>
            <strong>{stats.students}</strong>
          </article>
        </div>
      ) : null}

      <div className="admin-users-toolbar">
        <label className="admin-users-search">
          <span className="sr-only">Search users</span>
          <input
            type="search"
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
        <div className="admin-users-filters">
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            {ROLE_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {STATUS_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? <p className="admin-users-loading">Loading users…</p> : null}
      {!loading && !users.length ? (
        <div className="admin-users-empty">
          <h2>No users found</h2>
          <p>Try a different search term or filter.</p>
        </div>
      ) : null}

      {!loading && users.length ? (
        <div className="admin-users-table-wrap">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Joined</th>
                <th>Last active</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <button
                      type="button"
                      className="admin-users-user-cell"
                      onClick={() => openUserModal(user)}
                    >
                      <span className="admin-users-avatar" aria-hidden="true">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" />
                        ) : (
                          getInitials(user.name)
                        )}
                      </span>
                      <span className="admin-users-user-copy">
                        <strong>{user.name}</strong>
                        <span>{user.email}</span>
                      </span>
                    </button>
                  </td>
                  <td>
                    <span className={`admin-users-role admin-users-role--${user.role.toLowerCase()}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`admin-users-status admin-users-status--${user.status.toLowerCase()}`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td>
                    {user.role === 'ADMIN' ? (
                      <span className="admin-users-muted">—</span>
                    ) : (
                      <span className="admin-users-progress">
                        Lv {user.level ?? 1} • {user.xp ?? 0} XP
                      </span>
                    )}
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>{formatDate(user.lastActiveAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn admin-btn--compact"
                      onClick={() => openUserModal(user)}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <AdminModal
        open={modal === 'detail' && Boolean(activeUser)}
        title={activeUser?.name || 'User'}
        subtitle={activeUser?.email}
        onClose={closeUserModal}
        size="wide"
        footer={
          <div className="admin-users-modal-footer">
            {canDeleteUser ? (
              <button
                type="button"
                className="admin-btn admin-btn--danger-outline"
                onClick={() => openDeleteModal(activeUser)}
                disabled={saving || detailLoading}
              >
                Delete user
              </button>
            ) : (
              <span />
            )}
            <div className="admin-modal-action-row">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={closeUserModal} disabled={saving}>
                Cancel
              </button>
              {activeUser?.status === 'ACTIVE' && !isSelf ? (
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => handleSaveUser({ status: 'BLOCKED' })}
                  disabled={saving || detailLoading}
                >
                  Block user
                </button>
              ) : null}
              {activeUser?.status === 'BLOCKED' ? (
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => handleSaveUser({ status: 'ACTIVE' })}
                  disabled={saving || detailLoading}
                >
                  Unblock user
                </button>
              ) : null}
              <button
                type="button"
                className="admin-btn admin-btn--accent"
                onClick={() => handleSaveUser()}
                disabled={saving || detailLoading || !editForm.name.trim()}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        }
      >
        {detailLoading ? <p className="admin-users-loading">Loading user details…</p> : null}

        {!detailLoading && activeUser ? (
          <div className="admin-users-detail">
            <section className="admin-users-detail-panel">
              <h3>Account</h3>
              <label>
                Full name
                <input
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label>
                Role
                <select
                  value={editForm.role}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, role: event.target.value }))
                  }
                  disabled={isSelf}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  value={editForm.status}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, status: event.target.value }))
                  }
                  disabled={isSelf}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              {isSelf ? (
                <p className="admin-users-self-note">You cannot block yourself or remove your admin role.</p>
              ) : null}
            </section>

            <section className="admin-users-detail-panel">
              <h3>Profile info</h3>
              <div className="admin-users-detail-grid">
                <div>
                  <span>Joined</span>
                  <strong>{formatDateTime(activeUser.createdAt)}</strong>
                </div>
                <div>
                  <span>Last active</span>
                  <strong>{formatDateTime(activeUser.lastActiveAt)}</strong>
                </div>
                <div>
                  <span>Onboarding</span>
                  <strong>{activeUser.onboardingCompleted ? 'Completed' : 'Incomplete'}</strong>
                </div>
                <div>
                  <span>Learning goal</span>
                  <strong>{activeUser.learningGoal?.trim() || '—'}</strong>
                </div>
                <div>
                  <span>Course enrollments</span>
                  <strong>{activeUser.enrollmentCount ?? 0}</strong>
                </div>
                <div>
                  <span>Resumes saved</span>
                  <strong>{activeUser.resumeCount ?? 0}</strong>
                </div>
              </div>
              {activeUser.resumeCount ? (
                <Link to={ROUTES.adminResumes} className="admin-users-link">
                  View resumes in admin →
                </Link>
              ) : null}
            </section>

            {activeUser.stats ? (
              <section className="admin-users-detail-panel admin-users-detail-panel--full">
                <h3>Learning & arena stats</h3>
                <div className="admin-users-detail-grid admin-users-detail-grid--stats">
                  <div>
                    <span>Level</span>
                    <strong>{activeUser.stats.level}</strong>
                  </div>
                  <div>
                    <span>Total XP</span>
                    <div className="admin-users-xp-head">
                      <strong>{activeUser.stats.totalXp}</strong>
                      <button
                        type="button"
                        className="admin-btn admin-btn--compact admin-btn--ghost"
                        onClick={openXpHistoryModal}
                      >
                        View XP details
                      </button>
                    </div>
                  </div>
                  <div>
                    <span>Current streak</span>
                    <strong>{activeUser.stats.currentStreak} days</strong>
                  </div>
                  <div>
                    <span>Longest streak</span>
                    <strong>{activeUser.stats.longestStreak} days</strong>
                  </div>
                  <div>
                    <span>Courses enrolled</span>
                    <strong>{activeUser.stats.coursesEnrolled}</strong>
                  </div>
                  <div>
                    <span>Courses completed</span>
                    <strong>{activeUser.stats.coursesCompleted}</strong>
                  </div>
                  <div>
                    <span>Lessons completed</span>
                    <strong>{activeUser.stats.lessonsCompleted}</strong>
                  </div>
                  <div>
                    <span>Battles won</span>
                    <strong>{activeUser.stats.battlesWon}</strong>
                  </div>
                  <div>
                    <span>Battles played</span>
                    <strong>{activeUser.stats.battlesPlayed}</strong>
                  </div>
                  <div>
                    <span>Assessments done</span>
                    <strong>{activeUser.stats.assessmentsCompleted}</strong>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </AdminModal>

      <AdminModal
        open={modal === 'xp' && Boolean(activeUser)}
        title={`XP breakdown — ${activeUser?.name || 'User'}`}
        subtitle={`Total XP: ${xpHistory?.totalXp ?? activeUser?.stats?.totalXp ?? 0}`}
        onClose={closeXpHistoryModal}
        size="wide"
        footer={
          <div className="admin-modal-action-row">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={closeXpHistoryModal}>
              Back to user
            </button>
          </div>
        }
      >
        {xpLoading ? <p className="admin-users-loading">Loading XP history…</p> : null}
        {xpError ? <p className="admin-users-xp-error">{xpError}</p> : null}

        {!xpLoading && !xpError && xpHistory ? (
          <div className="admin-users-xp-detail">
            <section className="admin-users-xp-section">
              <h3>XP by source</h3>
              {xpHistory.summaryBySource?.length ? (
                <div className="admin-users-xp-table-wrap">
                  <table className="admin-users-xp-table">
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Events</th>
                        <th>Earned</th>
                        <th>Reversed</th>
                        <th>Net XP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {xpHistory.summaryBySource.map((row) => (
                        <tr key={row.sourceType}>
                          <td>{row.sourceLabel}</td>
                          <td>{row.count}</td>
                          <td className="admin-users-xp-positive">+{row.earned}</td>
                          <td className="admin-users-xp-negative">
                            {row.reversed ? `-${row.reversed}` : '—'}
                          </td>
                          <td>
                            <strong>{row.net > 0 ? `+${row.net}` : row.net}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="admin-users-xp-empty">No XP activity recorded yet.</p>
              )}
            </section>

            <section className="admin-users-xp-section">
              <h3>Full XP ledger</h3>
              {xpHistory.entries?.length ? (
                <div className="admin-users-xp-table-wrap admin-users-xp-table-wrap--ledger">
                  <table className="admin-users-xp-table admin-users-xp-table--ledger">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Source</th>
                        <th>Details</th>
                        <th>XP</th>
                        <th>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {xpHistory.entries.map((entry) => (
                        <tr key={entry.id}>
                          <td>{formatDateTime(entry.date)}</td>
                          <td>{entry.sourceLabel}</td>
                          <td>{entry.description || '—'}</td>
                          <td
                            className={
                              entry.amount >= 0
                                ? 'admin-users-xp-positive'
                                : 'admin-users-xp-negative'
                            }
                          >
                            {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                          </td>
                          <td>{entry.balanceAfter}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="admin-users-xp-empty">No XP transactions yet.</p>
              )}
            </section>
          </div>
        ) : null}
      </AdminModal>

      <AdminModal
        open={modal === 'delete' && Boolean(deleteTarget)}
        title="Delete user"
        subtitle="This action cannot be undone."
        onClose={() => {
          setDeleteTarget(null)
          setModal(activeUser ? 'detail' : 'none')
        }}
        size="narrow"
        footer={
          <div className="admin-modal-action-row">
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={() => {
                setDeleteTarget(null)
                setModal(activeUser ? 'detail' : 'none')
              }}
              disabled={Boolean(deletingId)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--danger"
              onClick={handleDeleteUser}
              disabled={Boolean(deletingId)}
            >
              {deletingId ? 'Deleting…' : 'Delete user'}
            </button>
          </div>
        }
      >
        <p className="admin-users-delete-copy">
          Delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})? The account will be
          removed from the user list and will no longer be able to sign in.
        </p>
      </AdminModal>
    </div>
  )
}

export default AdminUsersPage
