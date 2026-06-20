import { API_BASE_URL } from '../config/env.js'

const getToken = () => localStorage.getItem('skillarena_token')

export const setAuth = (token, user) => {
  localStorage.setItem('skillarena_token', token)
  localStorage.setItem('skillarena_user', JSON.stringify(user))
}

export const clearAuth = () => {
  localStorage.removeItem('skillarena_token')
  localStorage.removeItem('skillarena_user')
}

export const getStoredUser = () => {
  const raw = localStorage.getItem('skillarena_user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.message || 'Request failed')
    error.status = response.status
    error.code = data.code
    error.previousLessonId = data.previousLessonId
    error.retryAfterSeconds = data.retryAfterSeconds
    throw error
  }

  return data
}

export const authApi = {
  signup: (payload) =>
    request('/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  forgotPassword: (payload) =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/auth/me'),
  updateMe: (payload) =>
    request('/auth/me', { method: 'PATCH', body: JSON.stringify(payload) }),
}

export const homeApi = {
  get: () => request('/home'),
}

export const platformApi = {
  courses: () => request('/platform/courses', { auth: false }),
  course: (courseId) => request(`/platform/courses/${courseId}`, { auth: false }),
  lesson: (lessonId) => request(`/platform/lessons/${lessonId}`, { auth: false }),
  practice: () => request('/platform/practice', { auth: false }),
  battles: () => request('/platform/battles'),
  blogs: () => request('/platform/blogs', { auth: false }),
  blog: (slug) => request(`/platform/blogs/${slug}`, { auth: false }),
}

export const adminApi = {
  overview: () => request('/admin/overview'),
  categories: () => request('/admin/categories'),
  createCategory: (payload) =>
    request('/admin/categories', { method: 'POST', body: JSON.stringify(payload) }),
  deleteCategory: (id) => request(`/admin/categories/${id}`, { method: 'DELETE' }),
  skills: () => request('/admin/skills'),
  createSkill: (payload) =>
    request('/admin/skills', { method: 'POST', body: JSON.stringify(payload) }),
  deleteSkill: (id) => request(`/admin/skills/${id}`, { method: 'DELETE' }),
  courses: () => request('/admin/courses'),
  createCourse: (payload) =>
    request('/admin/courses', { method: 'POST', body: JSON.stringify(payload) }),
  generateCourseWithAI: (payload) =>
    request('/admin/courses/generate-ai', { method: 'POST', body: JSON.stringify(payload) }),
  generateCourseWithAIStream: async (payload, handlers = {}) => {
    const token = getToken()
    const response = await fetch(`${API_BASE_URL}/admin/courses/generate-ai/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: handlers.signal,
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      const error = new Error(data.message || 'Request failed')
      error.status = response.status
      error.code = data.code
      throw error
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('Streaming is not supported in this browser.')

    const decoder = new TextDecoder()
    let buffer = ''
    let result = null

    const dispatch = (block) => {
      if (!block.trim()) return
      let eventName = 'message'
      let dataText = ''
      block.split('\n').forEach((line) => {
        if (line.startsWith('event:')) eventName = line.slice(6).trim()
        if (line.startsWith('data:')) dataText += line.slice(5).trim()
      })
      if (!dataText) return
      const parsed = JSON.parse(dataText)
      if (eventName === 'progress') handlers.onProgress?.(parsed)
      if (eventName === 'complete') {
        result = parsed
        handlers.onComplete?.(parsed)
      }
      if (eventName === 'error') {
        const error = new Error(parsed.message || 'Request failed')
        error.code = parsed.code
        error.retryAfterSeconds = parsed.retryAfterSeconds
        handlers.onError?.(error)
        throw error
      }
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const blocks = buffer.split('\n\n')
      buffer = blocks.pop() || ''
      blocks.forEach(dispatch)
    }

    if (buffer.trim()) dispatch(buffer)
    return result
  },
  updateCourse: (id, payload) =>
    request(`/admin/courses/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteCourse: (id) => request(`/admin/courses/${id}`, { method: 'DELETE' }),
  courseModules: (courseId) => request(`/admin/courses/${courseId}/modules`),
  createModule: (courseId, payload) =>
    request(`/admin/courses/${courseId}/modules`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteModule: (courseId, moduleId) =>
    request(`/admin/courses/${courseId}/modules/${moduleId}`, { method: 'DELETE' }),
  moduleLessons: (courseId, moduleId) =>
    request(`/admin/courses/${courseId}/modules/${moduleId}/lessons`),
  createLesson: (courseId, moduleId, payload) =>
    request(`/admin/courses/${courseId}/modules/${moduleId}/lessons`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateLesson: (lessonId, payload) =>
    request(`/admin/lessons/${lessonId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteLesson: (lessonId) => request(`/admin/lessons/${lessonId}`, { method: 'DELETE' }),
  createLessonQuiz: (lessonId, payload) =>
    request(`/admin/lessons/${lessonId}/quiz`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createLessonCoding: (lessonId, payload) =>
    request(`/admin/lessons/${lessonId}/coding`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getLessonCoding: (lessonId) => request(`/admin/lessons/${lessonId}/coding`),
  updateLessonCoding: (lessonId, payload) =>
    request(`/admin/lessons/${lessonId}/coding`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  assessments: (type = 'PRACTICE') => request(`/admin/assessments?type=${type}`),
  assessment: (id) => request(`/admin/assessments/${id}`),
  createAssessment: (payload) =>
    request('/admin/assessments', { method: 'POST', body: JSON.stringify(payload) }),
  updateAssessment: (id, payload) =>
    request(`/admin/assessments/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteAssessment: (id) => request(`/admin/assessments/${id}`, { method: 'DELETE' }),
  createQuestion: (payload) =>
    request('/admin/questions', { method: 'POST', body: JSON.stringify(payload) }),
  updateQuestion: (id, payload) =>
    request(`/admin/questions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  addQuestionToAssessment: (assessmentId, payload) =>
    request(`/admin/assessments/${assessmentId}/questions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  removeQuestionFromAssessment: (assessmentId, questionId) =>
    request(`/admin/assessments/${assessmentId}/questions/${questionId}`, {
      method: 'DELETE',
    }),
  blogs: () => request('/admin/blogs'),
  createBlog: (payload) =>
    request('/admin/blogs', { method: 'POST', body: JSON.stringify(payload) }),
  updateBlog: (id, payload) =>
    request(`/admin/blogs/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteBlog: (id) => request(`/admin/blogs/${id}`, { method: 'DELETE' }),
  resumes: () => request('/admin/resumes'),
  deleteResume: (id) => request(`/admin/resumes/${id}`, { method: 'DELETE' }),
  users: (params = {}) => {
    const query = new URLSearchParams()
    if (params.search) query.set('search', params.search)
    if (params.role) query.set('role', params.role)
    if (params.status) query.set('status', params.status)
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return request(`/admin/users${suffix}`)
  },
  user: (id) => request(`/admin/users/${id}`),
  updateUser: (id, payload) =>
    request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
}

export const resumeApi = {
  getMine: () => request('/resume/me'),
  saveMine: (payload) =>
    request('/resume/me', { method: 'PUT', body: JSON.stringify(payload) }),
  deleteMine: () => request('/resume/me', { method: 'DELETE' }),
  generateAI: (payload) =>
    request('/resume/ai', { method: 'POST', body: JSON.stringify(payload) }),
}

export const learningApi = {
  enroll: (courseId) =>
    request(`/learning/courses/${courseId}/enroll`, { method: 'POST' }),
  courseProgress: (courseId) => request(`/learning/courses/${courseId}/progress`),
  startLesson: (lessonId) =>
    request(`/learning/lessons/${lessonId}/start`, { method: 'POST' }),
  lessonProgress: (lessonId) => request(`/learning/lessons/${lessonId}/progress`),
  lessonAccess: (lessonId) => request(`/learning/lessons/${lessonId}/access`),
  completeLesson: (lessonId) =>
    request(`/learning/lessons/${lessonId}/complete`, { method: 'POST' }),
  markIncomplete: (lessonId) =>
    request(`/learning/lessons/${lessonId}/mark-incomplete`, { method: 'POST' }),
  videoProgress: (lessonId, payload) =>
    request(`/learning/lessons/${lessonId}/video-progress`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  submitQuiz: (lessonId, answers) =>
    request(`/learning/lessons/${lessonId}/quiz/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),
  quizAttempts: (lessonId) => request(`/learning/lessons/${lessonId}/quiz/attempts`),
  getCoding: (lessonId) => request(`/learning/lessons/${lessonId}/coding`),
  saveCodingDraft: (lessonId, draft) =>
    request(`/learning/lessons/${lessonId}/coding/draft`, {
      method: 'PATCH',
      body: JSON.stringify(draft),
    }),
  runCoding: (lessonId, code) =>
    request(`/learning/lessons/${lessonId}/coding/run`, {
      method: 'POST',
      body: JSON.stringify(code),
    }),
  submitCoding: (lessonId, code) =>
    request(`/learning/lessons/${lessonId}/coding/submit`, {
      method: 'POST',
      body: JSON.stringify(code),
    }),
  codingAttempts: (lessonId) => request(`/learning/lessons/${lessonId}/coding/attempts`),
}
