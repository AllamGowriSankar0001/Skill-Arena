import { API_BASE_URL } from '../config/env.js'

const getToken = () => localStorage.getItem('skillarena_token')

const pdfBlobCache = new Map()
const inFlightRequests = new Map()

export const slugifyFilename = (name) =>
  (name || 'resume')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'resume'

const cacheKeyForAts = (ats) => JSON.stringify(ats)

const fetchPdfBlob = async (ats) => {
  const key = cacheKeyForAts(ats)
  const cached = pdfBlobCache.get(key)
  if (cached) return cached

  let pending = inFlightRequests.get(key)
  if (!pending) {
    pending = (async () => {
      const token = getToken()
      const response = await fetch(`${API_BASE_URL}/resume/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ats }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || data.detail || 'Failed to generate resume PDF')
      }

      const blob = await response.blob()
      pdfBlobCache.set(key, blob)
      return blob
    })().finally(() => {
      inFlightRequests.delete(key)
    })
    inFlightRequests.set(key, pending)
  }

  return pending
}

export const warmAtsResumePdf = (ats) => {
  if (!ats) return
  fetchPdfBlob(ats).catch(() => {})
}

const triggerBlobDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export const downloadAtsResumePdf = async (ats, filename) => {
  const fileName = filename || `${slugifyFilename(ats.name)}-resume.pdf`
  const blob = await fetchPdfBlob(ats)
  triggerBlobDownload(blob, fileName)
}
