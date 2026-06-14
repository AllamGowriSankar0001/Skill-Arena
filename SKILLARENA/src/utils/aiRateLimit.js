export const DEFAULT_AI_RETRY_SECONDS = 60

const RATE_LIMIT_MESSAGE_PATTERN =
  /quota|rate limit|resource has been exhausted|too many requests|high demand|exceeded your current|temporarily busy/i

const RETRY_SECONDS_PATTERNS = [
  /please try again in (\d+(?:\.\d+)?)\s*s(?:econds?)?/i,
  /retry in (\d+(?:\.\d+)?)\s*s(?:econds?)?/i,
  /retry after (\d+(?:\.\d+)?)\s*s(?:econds?)?/i,
  /"retryDelay"\s*:\s*"?(\d+)/i,
]

export const isAiRateLimitError = (error) => {
  if (!error) return false
  if (error.code === 'AI_RATE_LIMIT') return true
  if (error.status === 429) return true
  const message = String(error.message || error)
  return RATE_LIMIT_MESSAGE_PATTERN.test(message)
}

export const isAiKeyRequiredError = (error) => {
  if (!error) return false
  if (error.code === 'AI_KEY_REQUIRED') return true
  if (error.status === 503 && /api key/i.test(String(error.message || ''))) return true
  return false
}

export const parseAiRetrySeconds = (error, fallback = DEFAULT_AI_RETRY_SECONDS) => {
  if (error?.retryAfterSeconds != null) {
    return Math.max(1, Math.ceil(Number(error.retryAfterSeconds)))
  }

  const message = String(error?.message || error || '')
  for (const pattern of RETRY_SECONDS_PATTERNS) {
    const match = message.match(pattern)
    if (match) return Math.max(1, Math.ceil(Number(match[1])))
  }

  return fallback
}

export const formatAiBusyMessage = (seconds) => {
  const safeSeconds = Math.max(0, Math.ceil(Number(seconds) || 0))
  const unit = safeSeconds === 1 ? 'second' : 'seconds'
  return `The server is currently busy. Please try again in ${safeSeconds} ${unit}.`
}
