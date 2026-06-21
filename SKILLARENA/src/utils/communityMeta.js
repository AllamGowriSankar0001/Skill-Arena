export const formatDateLabel = (value) => {
  if (!value) return ''
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export const groupMessagesByDate = (messages = []) => {
  const groups = []
  let currentDate = null
  messages.forEach((message) => {
    const dateKey = new Date(message.createdAt).toDateString()
    if (dateKey !== currentDate) {
      currentDate = dateKey
      groups.push({
        type: 'date',
        key: `date-${dateKey}`,
        label: formatDateLabel(message.createdAt),
      })
    }
    groups.push({ type: 'message', key: message.id, message })
  })
  return groups
}

export const formatRelativeTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export const formatMessageTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  const now = new Date()
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  if (sameDay) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export const groupChannels = (channels = []) => {
  const global = channels.filter((channel) => channel.type === 'GLOBAL')
  const official = channels.filter((channel) => channel.type === 'ROOM' && channel.isOfficial)
  const rooms = channels.filter((channel) => channel.type === 'ROOM' && !channel.isOfficial)
  const categories = channels.filter((channel) => channel.type === 'CATEGORY')
  const courses = channels.filter((channel) => channel.type === 'COURSE')
  return { global, official, rooms, categories, courses }
}

export const findChannel = (channels, channelId) =>
  channels.find((channel) => channel.id === channelId) || channels[0] || null
