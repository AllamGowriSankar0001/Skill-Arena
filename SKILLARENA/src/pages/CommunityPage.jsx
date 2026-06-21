import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AppEmptyState from '../components/AppEmptyState'
import BoneyardSkeleton from '../components/BoneyardSkeleton'
import CommunityMessagePreview from '../components/CommunityMessagePreview'
import { MOCK_COMMUNITY_MESSAGE } from '../fixtures/skeletonFixtures'
import { useAuth } from '../context/AuthContext'
import { learningApi } from '../services/api'
import {
  findChannel,
  formatMessageTime,
  formatRelativeTime,
  getInitials,
  groupChannels,
  groupMessagesByDate,
} from '../utils/communityMeta'
import './CommunityPage.css'

const AuthorAvatar = ({ author, size = 'md' }) => {
  if (!author) return null
  return (
    <span className={`disc-avatar disc-avatar--${size}`} aria-hidden="true">
      {author.avatarUrl ? (
        <img src={author.avatarUrl} alt="" />
      ) : (
        <span>{getInitials(author.name)}</span>
      )}
    </span>
  )
}

const ChannelButton = ({ channel, active, onSelect }) => (
  <button
    type="button"
    className={`disc-channel${active ? ' is-active' : ''}${channel.type === 'ROOM' ? ' disc-channel--room' : ''}${channel.isOfficial ? ' disc-channel--official' : ''}`}
    onClick={() => onSelect(channel.id)}
  >
    <span className="disc-channel-hash" aria-hidden="true">
      {channel.isOfficial ? '★' : channel.type === 'ROOM' ? '◆' : '#'}
    </span>
    <span className="disc-channel-name">{channel.name}</span>
    {channel.isOfficial ? (
      <span className="disc-channel-official" title="Official admin community">
        Official
      </span>
    ) : null}
    {channel.hasPassword ? (
      <span className="disc-channel-lock" title="Password protected" aria-label="Password protected">
        🔒
      </span>
    ) : null}
    {channel.postCount > 0 ? (
      <span className="disc-channel-count">{channel.postCount}</span>
    ) : null}
  </button>
)

const CommunityModal = ({ title, onClose, children }) => (
  <div className="disc-modal-backdrop" role="presentation" onClick={onClose}>
    <div
      className="disc-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disc-modal-title"
      onClick={(event) => event.stopPropagation()}
    >
      <header className="disc-modal-header">
        <h2 id="disc-modal-title">{title}</h2>
        <button type="button" className="disc-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>
      {children}
    </div>
  </div>
)

const CreateCommunityModal = ({ onClose, onCreated, isAdmin = false }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [usePassword, setUsePassword] = useState(false)
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!name.trim() || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const { room } = await learningApi.createCommunityRoom({
        name: name.trim(),
        description: description.trim(),
        password: usePassword ? password : '',
      })
      onCreated(room)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create community')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CommunityModal title="Create community" onClose={onClose}>
      {isAdmin ? (
        <p className="disc-modal-lead disc-modal-lead--official">
          Admin communities are marked official with a golden badge and are visible to all learners.
        </p>
      ) : null}
      <form className="disc-modal-form" onSubmit={handleSubmit}>
        <label className="disc-modal-field">
          <span>Name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. JS Study Squad"
            maxLength={80}
            required
          />
        </label>
        <label className="disc-modal-field">
          <span>Description (optional)</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What is this community about?"
            rows={3}
            maxLength={500}
          />
        </label>
        <label className="disc-modal-check">
          <input
            type="checkbox"
            checked={usePassword}
            onChange={(event) => setUsePassword(event.target.checked)}
          />
          <span>Require a password to join</span>
        </label>
        {usePassword ? (
          <label className="disc-modal-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 4 characters"
              minLength={4}
              required={usePassword}
            />
          </label>
        ) : null}
        {error ? <p className="disc-form-error">{error}</p> : null}
        <div className="disc-modal-actions">
          <button type="button" className="disc-modal-btn disc-modal-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="disc-modal-btn disc-modal-btn--primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create community'}
          </button>
        </div>
      </form>
    </CommunityModal>
  )
}

const EditCommunityModal = ({ channel, onClose, onUpdated, onDeleted }) => {
  const [name, setName] = useState(channel?.name || '')
  const [description, setDescription] = useState(channel?.description || '')
  const [usePassword, setUsePassword] = useState(Boolean(channel?.hasPassword))
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!name.trim() || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
      }
      if (!usePassword) {
        payload.removePassword = true
      } else if (password.trim()) {
        payload.password = password.trim()
      }
      const { room } = await learningApi.updateCommunityRoom(channel.roomId, payload)
      onUpdated(room)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to update community')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (deleting || !window.confirm(`Delete "${channel.name}"? This cannot be undone.`)) return
    setDeleting(true)
    setError('')
    try {
      await learningApi.deleteCommunityRoom(channel.roomId)
      onDeleted(channel.id)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to delete community')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <CommunityModal title="Edit community" onClose={onClose}>
      <form className="disc-modal-form" onSubmit={handleSubmit}>
        <label className="disc-modal-field">
          <span>Name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            required
          />
        </label>
        <label className="disc-modal-field">
          <span>Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            maxLength={500}
          />
        </label>
        <label className="disc-modal-check">
          <input
            type="checkbox"
            checked={usePassword}
            onChange={(event) => setUsePassword(event.target.checked)}
          />
          <span>Require a password to join</span>
        </label>
        {usePassword ? (
          <label className="disc-modal-field">
            <span>{channel?.hasPassword ? 'New password (leave blank to keep current)' : 'Password'}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 4 characters"
              minLength={password.trim() ? 4 : undefined}
            />
          </label>
        ) : null}
        {error ? <p className="disc-form-error">{error}</p> : null}
        <div className="disc-modal-actions disc-modal-actions--split">
          <button
            type="button"
            className="disc-modal-btn disc-modal-btn--danger"
            onClick={handleDelete}
            disabled={deleting || submitting}
          >
            {deleting ? 'Deleting…' : 'Delete community'}
          </button>
          <div className="disc-modal-actions">
            <button type="button" className="disc-modal-btn disc-modal-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="disc-modal-btn disc-modal-btn--primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>
    </CommunityModal>
  )
}

const JoinCommunityModal = ({ onClose, onJoined }) => {
  const [inviteCode, setInviteCode] = useState('')
  const [password, setPassword] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!inviteCode.trim() || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const { room } = await learningApi.joinCommunityRoom({
        inviteCode: inviteCode.trim(),
        password: password.trim(),
      })
      onJoined(room)
      onClose()
    } catch (err) {
      if (err.code === 'PASSWORD_REQUIRED') {
        setNeedsPassword(true)
        setError('Enter the community password to join.')
      } else {
        setError(err.message || 'Failed to join community')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CommunityModal title="Join community" onClose={onClose}>
      <form className="disc-modal-form" onSubmit={handleSubmit}>
        <p className="disc-modal-lead">Enter the invite code shared by the community owner.</p>
        <label className="disc-modal-field">
          <span>Invite code</span>
          <input
            type="text"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
            placeholder="e.g. A1B2C3D4"
            maxLength={16}
            required
          />
        </label>
        {needsPassword ? (
          <label className="disc-modal-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Community password"
              required
            />
          </label>
        ) : null}
        {error ? <p className="disc-form-error">{error}</p> : null}
        <div className="disc-modal-actions">
          <button type="button" className="disc-modal-btn disc-modal-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="disc-modal-btn disc-modal-btn--primary" disabled={submitting}>
            {submitting ? 'Joining…' : 'Join community'}
          </button>
        </div>
      </form>
    </CommunityModal>
  )
}

const COMMUNITY_MESSAGE_FIXTURE = (
  <CommunityMessagePreview message={MOCK_COMMUNITY_MESSAGE} />
)

const ThreadReplies = ({ messageId, commentCount, onCountChange }) => {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadComments = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await learningApi.communityComments(messageId)
      setComments(data.comments || [])
    } catch (err) {
      setError(err.message || 'Failed to load replies')
    } finally {
      setLoading(false)
    }
  }, [messageId])

  useEffect(() => {
    if (open && !comments.length && !loading) loadComments()
  }, [open, comments.length, loading, loadComments])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!draft.trim() || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const data = await learningApi.addCommunityComment(messageId, draft.trim())
      setComments((prev) => [...prev, data.comment])
      setDraft('')
      onCountChange(data.commentCount)
    } catch (err) {
      setError(err.message || 'Failed to send reply')
    } finally {
      setSubmitting(false)
    }
  }

  if (!commentCount && !open) return null

  return (
    <div className="disc-thread">
      <button
        type="button"
        className="disc-thread-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="disc-thread-toggle-icon" aria-hidden="true" />
        {open ? 'Hide' : 'View'} {commentCount} repl{commentCount === 1 ? 'y' : 'ies'}
      </button>

      {open ? (
        <div className="disc-thread-panel">
          {loading ? <p className="disc-thread-status">Loading replies…</p> : null}
          {error ? <p className="disc-form-error">{error}</p> : null}

          <ul className="disc-thread-list">
            {comments.map((comment) => (
              <li key={comment.id} className={`disc-thread-item${comment.author?.isAdmin ? ' disc-thread-item--admin' : ''}`}>
                <AuthorAvatar author={comment.author} size="sm" />
                <div>
                  <div className="disc-message-head">
                    <strong>{comment.author?.name || 'Learner'}</strong>
                    {comment.author?.isAdmin ? (
                      <span className="disc-admin-badge">Admin</span>
                    ) : null}
                    <time dateTime={comment.createdAt}>
                      {formatRelativeTime(comment.createdAt)}
                    </time>
                  </div>
                  <p>{comment.content}</p>
                </div>
              </li>
            ))}
            {!loading && !comments.length ? (
              <li className="disc-thread-status">No replies yet.</li>
            ) : null}
          </ul>

          <form className="disc-thread-compose" onSubmit={handleSubmit}>
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Reply in thread…"
              maxLength={1200}
            />
            <button type="submit" disabled={submitting || !draft.trim()}>
              Send
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}

const ChatMessage = ({ message, onLike, onDelete, onCommentCountChange }) => {
  const [liking, setLiking] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleLike = async () => {
    if (liking) return
    setLiking(true)
    try {
      await onLike(message.id)
    } finally {
      setLiking(false)
    }
  }

  const handleDelete = async () => {
    if (deleting || !window.confirm('Delete this message?')) return
    setDeleting(true)
    try {
      await onDelete(message.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <article className={`disc-message${message.isAdminMessage ? ' disc-message--admin' : ''}`}>
      <AuthorAvatar author={message.author} size="md" />
      <div className="disc-message-body">
        <div className="disc-message-head">
          <strong>{message.author?.name || 'Learner'}</strong>
          {message.isAdminMessage ? (
            <span className="disc-admin-badge">Admin</span>
          ) : message.author?.rankLabel ? (
            <span className="disc-rank">{message.author.rankLabel}</span>
          ) : null}
          <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
          {message.isOwner ? (
            <button
              type="button"
              className="disc-message-delete"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Delete message"
            >
              Delete
            </button>
          ) : null}
        </div>

        <p className="disc-message-text">{message.content}</p>

        {message.linkUrl ? (
          <a
            href={message.linkUrl}
            className="disc-message-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="disc-message-link-icon" aria-hidden="true" />
            {message.linkUrl.replace(/^https?:\/\//, '')}
          </a>
        ) : null}

        <div className="disc-message-actions">
          <button
            type="button"
            className={`disc-reaction${message.liked ? ' is-active' : ''}`}
            onClick={handleLike}
            disabled={liking}
            aria-pressed={message.liked}
          >
            <span className="disc-reaction-icon" aria-hidden="true" />
            {message.likeCount > 0 ? message.likeCount : 'Like'}
          </button>
          {message.commentCount > 0 ? (
            <span className="disc-reply-count">
              {message.commentCount} repl{message.commentCount === 1 ? 'y' : 'ies'}
            </span>
          ) : null}
        </div>

        <ThreadReplies
          messageId={message.id}
          commentCount={message.commentCount}
          onCountChange={(count) => onCommentCountChange(message.id, count)}
        />
      </div>
    </article>
  )
}

const ChannelWelcome = ({ channel }) => (
  <div className={`disc-welcome${channel?.isOfficial ? ' disc-welcome--official' : ''}`}>
    <div className="disc-welcome-icon" aria-hidden="true">
      {channel?.isOfficial ? '★' : '#'}
    </div>
    <h2>
      Welcome to {channel?.isOfficial ? '' : '#'}
      {channel?.name || 'general'}
    </h2>
    {channel?.isOfficial ? (
      <p className="disc-welcome-official-label">Official Skill Arena community</p>
    ) : null}
    <p>{channel?.description}</p>
    <p className="disc-welcome-hint">This is the start of the channel. Be the first to say hello.</p>
  </div>
)

const CommunityPage = ({ adminLayout = false }) => {
  const { user } = useAuth()
  const isPlatformAdmin = user?.role === 'ADMIN'
  const [channels, setChannels] = useState([])
  const [stats, setStats] = useState(null)
  const [activeChannel, setActiveChannel] = useState('global')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [channelQuery, setChannelQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)
  const messagesRef = useRef(null)
  const shouldScrollRef = useRef(true)

  const channelGroups = useMemo(() => groupChannels(channels), [channels])
  const currentChannel = useMemo(
    () => findChannel(channels, activeChannel),
    [channels, activeChannel],
  )

  const filterChannels = useCallback(
    (list = []) => {
      const query = channelQuery.trim().toLowerCase()
      if (!query) return list
      return list.filter((channel) => channel.name.toLowerCase().includes(query))
    },
    [channelQuery],
  )

  const filteredGroups = useMemo(
    () => ({
      global: filterChannels(channelGroups.global),
      official: filterChannels(channelGroups.official || []),
      rooms: filterChannels(channelGroups.rooms),
      categories: filterChannels(channelGroups.categories),
      courses: filterChannels(channelGroups.courses),
    }),
    [channelGroups, filterChannels],
  )

  const messageGroups = useMemo(() => groupMessagesByDate(messages), [messages])

  const loadMeta = useCallback(async () => {
    const meta = await learningApi.communityMeta()
    setChannels(meta.channels || [])
    setStats(meta.stats || null)
    return meta.channels || []
  }, [])

  const loadMessages = useCallback(async (channelId) => {
    setLoading(true)
    setError('')
    shouldScrollRef.current = true
    try {
      const feed = await learningApi.communityFeed({ channel: channelId })
      setMessages(feed.posts || [])
    } catch (err) {
      setError(err.message || 'Failed to load messages')
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMeta().catch(() => {})
  }, [loadMeta])

  useEffect(() => {
    loadMessages(activeChannel)
  }, [activeChannel, loadMessages])

  useEffect(() => {
    if (!shouldScrollRef.current || loading) return
    const node = messagesRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, activeChannel, loading])

  const selectChannel = (channelId) => {
    setActiveChannel(channelId)
    setSidebarOpen(false)
  }

  const handleSend = async (event) => {
    event.preventDefault()
    if (!draft.trim() || sending) return
    setSending(true)
    setSendError('')
    shouldScrollRef.current = true
    try {
      const { post } = await learningApi.createCommunityPost({
        content: draft.trim(),
        channel: activeChannel,
      })
      setMessages((prev) => [...prev, post])
      setDraft('')
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === activeChannel
            ? { ...channel, postCount: (channel.postCount || 0) + 1 }
            : channel,
        ),
      )
      setStats((prev) =>
        prev ? { ...prev, postCount: (prev.postCount || 0) + 1 } : prev,
      )
    } catch (err) {
      setSendError(err.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleLike = async (messageId) => {
    const result = await learningApi.toggleCommunityLike(messageId)
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? { ...message, liked: result.liked, likeCount: result.likeCount }
          : message,
      ),
    )
  }

  const handleDelete = async (messageId) => {
    await learningApi.deleteCommunityPost(messageId)
    setMessages((prev) => prev.filter((message) => message.id !== messageId))
    setChannels((prev) =>
      prev.map((channel) =>
        channel.id === activeChannel && channel.postCount > 0
          ? { ...channel, postCount: channel.postCount - 1 }
          : channel,
      ),
    )
  }

  const handleCommentCountChange = (messageId, count) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId ? { ...message, commentCount: count } : message,
      ),
    )
  }

  const refreshMeta = useCallback(async () => {
    const meta = await learningApi.communityMeta()
    setChannels(meta.channels || [])
    setStats(meta.stats || null)
    return meta.channels || []
  }, [])

  const handleRoomCreated = (room) => {
    setChannels((prev) => {
      const exists = prev.some((channel) => channel.id === room.id)
      if (exists) return prev
      const globalChannel = prev.find((channel) => channel.type === 'GLOBAL')
      const rest = prev.filter((channel) => channel.type !== 'GLOBAL')
      return globalChannel ? [globalChannel, room, ...rest] : [room, ...prev]
    })
    setActiveChannel(room.id)
  }

  const handleRoomJoined = (room) => {
    setChannels((prev) => {
      if (prev.some((channel) => channel.id === room.id)) {
        return prev.map((channel) => (channel.id === room.id ? { ...channel, ...room } : channel))
      }
      const globalChannel = prev.find((channel) => channel.type === 'GLOBAL')
      const rest = prev.filter((channel) => channel.type !== 'GLOBAL')
      return globalChannel ? [globalChannel, room, ...rest] : [room, ...prev]
    })
    setActiveChannel(room.id)
  }

  const isRoomChannel = currentChannel?.type === 'ROOM'

  const canManageRoom =
    isRoomChannel && (currentChannel?.canManage || currentChannel?.isOwner || isPlatformAdmin)

  const handleLeaveRoom = async () => {
    if (!currentChannel?.roomId) return
    if (!window.confirm(`Leave "${currentChannel.name}"?`)) return
    try {
      await learningApi.leaveCommunityRoom(currentChannel.roomId)
      await refreshMeta()
      setActiveChannel('global')
      setMessages([])
    } catch (err) {
      setError(err.message || 'Failed to leave community')
    }
  }

  const handleDeleteRoom = async () => {
    if (!currentChannel?.roomId || !canManageRoom) return
    if (!window.confirm(`Delete "${currentChannel.name}"? This cannot be undone.`)) return
    try {
      await learningApi.deleteCommunityRoom(currentChannel.roomId)
      await refreshMeta()
      setActiveChannel('global')
      setMessages([])
    } catch (err) {
      setError(err.message || 'Failed to delete community')
    }
  }

  const handleCopyInvite = async () => {
    if (!currentChannel?.inviteCode) return
    try {
      await navigator.clipboard.writeText(currentChannel.inviteCode)
      setInviteCopied(true)
      setTimeout(() => setInviteCopied(false), 2000)
    } catch {
      setInviteCopied(false)
    }
  }

  const handleRoomUpdated = (room) => {
    setChannels((prev) => prev.map((channel) => (channel.id === room.id ? { ...channel, ...room } : channel)))
  }

  const handleRoomDeletedFromEdit = (channelId) => {
    setChannels((prev) => prev.filter((channel) => channel.id !== channelId))
    setActiveChannel('global')
    setMessages([])
  }

  const hasVisibleChannels =
    filteredGroups.global.length > 0 ||
    filteredGroups.official.length > 0 ||
    filteredGroups.rooms.length > 0 ||
    filteredGroups.categories.length > 0 ||
    filteredGroups.courses.length > 0

  return (
    <main className={`disc-community${adminLayout ? ' disc-community--admin' : ''}`}>
      <div className="disc-community-shell">
        {sidebarOpen ? (
          <button
            type="button"
            className="disc-sidebar-backdrop"
            aria-label="Close channels"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <aside className={`disc-sidebar${sidebarOpen ? ' is-open' : ''}`} aria-label="Channels">
          <div className="disc-server">
            <span className="disc-server-mark" aria-hidden="true">
              SA
            </span>
            <div className="disc-server-copy">
              <strong>Skill Arena</strong>
              <span>Community</span>
            </div>
          </div>

          <div className="disc-channel-search">
            <input
              type="search"
              value={channelQuery}
              onChange={(event) => setChannelQuery(event.target.value)}
              placeholder="Search channels"
              aria-label="Search channels"
            />
          </div>

          <div className="disc-sidebar-actions">
            <button type="button" className="disc-sidebar-action" onClick={() => setShowCreateModal(true)}>
              + Create
            </button>
            <button type="button" className="disc-sidebar-action disc-sidebar-action--ghost" onClick={() => setShowJoinModal(true)}>
              Join
            </button>
          </div>

          <nav className="disc-channel-nav">
            {!hasVisibleChannels ? (
              <p className="disc-channel-empty">No channels match your search.</p>
            ) : null}

            {filteredGroups.global.length ? (
              <section className="disc-channel-group">
                <h2>Lounge</h2>
                {filteredGroups.global.map((channel) => (
                  <ChannelButton
                    key={channel.id}
                    channel={channel}
                    active={activeChannel === channel.id}
                    onSelect={selectChannel}
                  />
                ))}
              </section>
            ) : null}

            {filteredGroups.official.length ? (
              <section className="disc-channel-group disc-channel-group--official">
                <h2>Official</h2>
                {filteredGroups.official.map((channel) => (
                  <ChannelButton
                    key={channel.id}
                    channel={channel}
                    active={activeChannel === channel.id}
                    onSelect={selectChannel}
                  />
                ))}
              </section>
            ) : null}

            {filteredGroups.rooms.length ? (
              <section className="disc-channel-group">
                <h2>My communities</h2>
                {filteredGroups.rooms.map((channel) => (
                  <ChannelButton
                    key={channel.id}
                    channel={channel}
                    active={activeChannel === channel.id}
                    onSelect={selectChannel}
                  />
                ))}
              </section>
            ) : null}

            {filteredGroups.categories.length ? (
              <section className="disc-channel-group">
                <h2>Categories</h2>
                {filteredGroups.categories.map((channel) => (
                  <ChannelButton
                    key={channel.id}
                    channel={channel}
                    active={activeChannel === channel.id}
                    onSelect={selectChannel}
                  />
                ))}
              </section>
            ) : null}

            {filteredGroups.courses.length ? (
              <section className="disc-channel-group">
                <h2>Courses</h2>
                {filteredGroups.courses.map((channel) => (
                  <ChannelButton
                    key={channel.id}
                    channel={channel}
                    active={activeChannel === channel.id}
                    onSelect={selectChannel}
                  />
                ))}
              </section>
            ) : null}
          </nav>

          <div className="disc-sidebar-user">
            <AuthorAvatar
              author={{ name: user?.name, avatarUrl: user?.avatarUrl }}
              size="sm"
            />
            <div className="disc-sidebar-user-copy">
              <strong>{user?.name || 'You'}</strong>
              <span>{stats?.memberCount ?? 0} members online</span>
            </div>
          </div>
        </aside>

        <section className={`disc-chat${currentChannel?.isOfficial ? ' disc-chat--official' : ''}`}>
          <header className={`disc-chat-header${currentChannel?.isOfficial ? ' disc-chat-header--official' : ''}`}>
            <button
              type="button"
              className="disc-menu-btn"
              aria-label="Open channels"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="disc-menu-icon" aria-hidden="true" />
            </button>
            <div className="disc-chat-header-main">
              <div className="disc-chat-title-row">
                <h1>
                  <span className="disc-chat-hash" aria-hidden="true">
                    #
                  </span>
                  {currentChannel?.name || 'general'}
                </h1>
                {currentChannel?.postCount > 0 ? (
                  <span className="disc-chat-meta-pill">
                    {currentChannel.postCount} message{currentChannel.postCount === 1 ? '' : 's'}
                  </span>
                ) : null}
                {isRoomChannel && currentChannel?.memberCount ? (
                  <span className="disc-chat-meta-pill disc-chat-meta-pill--muted">
                    {currentChannel.memberCount} member{currentChannel.memberCount === 1 ? '' : 's'}
                  </span>
                ) : null}
                {isRoomChannel && currentChannel?.hasPassword ? (
                  <span className="disc-chat-meta-pill disc-chat-meta-pill--lock">Locked</span>
                ) : null}
                {currentChannel?.isOfficial ? (
                  <span className="disc-chat-meta-pill disc-chat-meta-pill--official">Official</span>
                ) : null}
              </div>
              <p>{currentChannel?.description || 'Community discussions'}</p>
              {isRoomChannel ? (
                <div className="disc-room-invite">
                  {currentChannel?.inviteCode ? (
                    <>
                      <span>Invite code:</span>
                      <code>{currentChannel.inviteCode}</code>
                      <button type="button" className="disc-room-invite-copy" onClick={handleCopyInvite}>
                        {inviteCopied ? 'Copied!' : 'Copy'}
                      </button>
                    </>
                  ) : null}
                  {canManageRoom ? (
                    <button type="button" className="disc-room-invite-edit" onClick={() => setShowEditModal(true)}>
                      Edit
                    </button>
                  ) : null}
                  {canManageRoom ? (
                    <button type="button" className="disc-room-invite-delete" onClick={handleDeleteRoom}>
                      Delete
                    </button>
                  ) : currentChannel?.isMember ? (
                    <button type="button" className="disc-room-invite-leave" onClick={handleLeaveRoom}>
                      Leave
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </header>

          <div
            className="disc-messages-wrap"
            ref={messagesRef}
            onScroll={() => {
              const node = messagesRef.current
              if (!node) return
              const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 120
              shouldScrollRef.current = nearBottom
            }}
          >
            <div className="disc-messages-inner">
              {loading ? (
                <div className="disc-messages">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <BoneyardSkeleton
                      key={index}
                      name="community-message"
                      loading
                      fixture={COMMUNITY_MESSAGE_FIXTURE}
                      className="disc-message-skeleton-wrap"
                    />
                  ))}
                </div>
              ) : null}

              {!loading && error ? (
                <AppEmptyState
                  title="Could not load channel"
                  description={error}
                  action={
                    <button
                      type="button"
                      className="disc-send-btn"
                      onClick={() => loadMessages(activeChannel)}
                    >
                      Try again
                    </button>
                  }
                />
              ) : null}

              {!loading && !error ? (
                <ChannelWelcome channel={currentChannel} />
              ) : null}

              {!loading && !error && messages.length ? (
                <div className="disc-messages">
                  {messageGroups.map((group) =>
                    group.type === 'date' ? (
                      <div key={group.key} className="disc-date-divider">
                        <span>{group.label}</span>
                      </div>
                    ) : (
                      <ChatMessage
                        key={group.key}
                        message={group.message}
                        onLike={handleLike}
                        onDelete={handleDelete}
                        onCommentCountChange={handleCommentCountChange}
                      />
                    ),
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <footer className="disc-compose">
            {sendError ? <p className="disc-form-error">{sendError}</p> : null}
            <form className="disc-compose-form" onSubmit={handleSend}>
              <input
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`Message #${currentChannel?.name || 'general'}`}
                maxLength={4000}
                disabled={sending}
                aria-label={`Message #${currentChannel?.name || 'general'}`}
              />
              <button type="submit" className="disc-send-btn" disabled={sending || !draft.trim()}>
                {sending ? 'Sending…' : 'Send'}
              </button>
            </form>
          </footer>
        </section>
      </div>

      {showCreateModal ? (
        <CreateCommunityModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleRoomCreated}
          isAdmin={isPlatformAdmin}
        />
      ) : null}
      {showEditModal && currentChannel?.roomId ? (
        <EditCommunityModal
          channel={currentChannel}
          onClose={() => setShowEditModal(false)}
          onUpdated={handleRoomUpdated}
          onDeleted={handleRoomDeletedFromEdit}
        />
      ) : null}
      {showJoinModal ? (
        <JoinCommunityModal onClose={() => setShowJoinModal(false)} onJoined={handleRoomJoined} />
      ) : null}
    </main>
  )
}

export default CommunityPage
