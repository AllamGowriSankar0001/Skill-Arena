import { getInitials } from '../utils/communityMeta'

const formatMessageTime = (value) => {
  if (!value) return 'Just now'
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

const CommunityMessagePreview = ({ message }) => (
  <article className={`disc-message${message.isAdminMessage ? ' disc-message--admin' : ''}`}>
    <span className="disc-avatar disc-avatar--md" aria-hidden="true">
      {message.author?.avatarUrl ? (
        <img src={message.author.avatarUrl} alt="" />
      ) : (
        <span>{getInitials(message.author?.name)}</span>
      )}
    </span>
    <div className="disc-message-body">
      <div className="disc-message-head">
        <strong>{message.author?.name || 'Learner'}</strong>
        {message.isAdminMessage ? (
          <span className="disc-admin-badge">Admin</span>
        ) : message.author?.rankLabel ? (
          <span className="disc-rank">{message.author.rankLabel}</span>
        ) : null}
        <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
      </div>
      <p className="disc-message-text">{message.content}</p>
    </div>
  </article>
)

export default CommunityMessagePreview
