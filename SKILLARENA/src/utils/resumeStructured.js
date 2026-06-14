export const createResumeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const emptyContact = () => ({
  email: '',
  phone: '',
  linkedin: '',
  location: '',
  customFields: [],
})

export const normalizeCustomFields = (fields = []) =>
  (Array.isArray(fields) ? fields : [])
    .map((field) => ({
      id: field.id || createResumeId(),
      label: field.label || '',
      value: field.value || '',
    }))
    .filter((field) => field.label.trim() || field.value.trim())

export const emptyExperience = () => ({
  id: createResumeId(),
  role: '',
  company: '',
  period: '',
  bullets: [''],
})

export const normalizeProjectSkills = (skills = []) => {
  if (typeof skills === 'string') {
    return skills
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (!Array.isArray(skills)) return []
  return [...new Set(skills.map((item) => String(item).trim()).filter(Boolean))]
}

export const emptyProject = () => ({
  id: createResumeId(),
  name: '',
  skills: [],
  bullets: ['', ''],
})

export const emptyEducation = () => ({
  id: createResumeId(),
  degree: '',
  shortName: '',
  institution: '',
  period: '',
  grade: '',
})

export const normalizeBullets = (bullets = [], max = 6) =>
  (Array.isArray(bullets) ? bullets : String(bullets).split('\n'))
    .map((item) => String(item).replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, max)

export const normalizeProjectBullets = (bullets = []) => normalizeBullets(bullets, 4)

export const normalizeExperiences = (items = []) => {
  if (!Array.isArray(items) || !items.length) return [emptyExperience()]
  return items.map((item) => ({
    id: item.id || createResumeId(),
    role: item.role || item.title || '',
    company: item.company || '',
    period: item.period || item.dates || '',
    bullets: normalizeBullets(item.bullets?.length ? item.bullets : [item.description || '']),
  }))
}

export const normalizeProjects = (items = []) => {
  if (!Array.isArray(items) || !items.length) return [emptyProject()]
  return items.map((item) => ({
    id: item.id || createResumeId(),
    name: item.name || item.title || '',
    skills: normalizeProjectSkills(item.skills),
    bullets: normalizeProjectBullets(item.bullets?.length ? item.bullets : [item.description || '']),
  }))
}

export const normalizeEducations = (items = []) => {
  if (!Array.isArray(items) || !items.length) return [emptyEducation()]
  return items.map((item) => ({
    id: item.id || createResumeId(),
    degree: item.degree || '',
    shortName: item.shortName || item.short || '',
    institution: item.institution || item.school || '',
    period: item.period || item.dates || '',
    grade: item.grade || item.cgpa || item.marks || '',
  }))
}

export const normalizeContact = (contact = {}) => ({
  email: contact.email || '',
  phone: contact.phone || '',
  linkedin: contact.linkedin || '',
  location: contact.location || '',
  customFields: normalizeCustomFields(contact.customFields),
})

export const migrateExperiencesFromText = (text = '') => {
  const lines = String(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) return [emptyExperience()]
  return lines.map((line) => ({
    id: createResumeId(),
    role: line,
    company: '',
    period: '',
    bullets: [],
  }))
}

export const migrateProjectsFromText = (text = '') => {
  const lines = String(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) return [emptyProject()]
  return lines.map((line) => ({
    id: createResumeId(),
    name: line,
    skills: [],
    bullets: ['', ''],
  }))
}

export const migrateEducationsFromText = (text = '') => {
  const trimmed = String(text).trim()
  if (!trimmed) return [emptyEducation()]
  return [
    {
      id: createResumeId(),
      degree: trimmed,
      shortName: '',
      institution: '',
      period: '',
      grade: '',
    },
  ]
}

export const hasExperienceContent = (item) =>
  Boolean(item.role?.trim() || item.company?.trim() || item.period?.trim() || normalizeBullets(item.bullets).length)

export const hasProjectContent = (item) => Boolean(item.name?.trim())

export const hasEducationContent = (item) =>
  Boolean(item.degree?.trim() || item.institution?.trim() || item.period?.trim() || item.grade?.trim())

export const filterFilledExperiences = (items = []) => items.filter(hasExperienceContent)

export const filterFilledProjects = (items = []) => items.filter(hasProjectContent)

export const filterFilledEducations = (items = []) => items.filter(hasEducationContent)

export const formatContactLine = (contact = {}) => {
  const normalized = normalizeContact(contact)
  const parts = [normalized.email, normalized.phone, normalized.location, normalized.linkedin]
    .map((v) => v?.trim())
    .filter(Boolean)
  const custom = normalized.customFields
    .filter((field) => field.label.trim() && field.value.trim())
    .map((field) => `${field.label.trim()}: ${field.value.trim()}`)
  return [...parts, ...custom].join(' | ')
}

export const formatExperienceForAI = (experiences = []) =>
  filterFilledExperiences(experiences)
    .map((item) => {
      const bullets = normalizeBullets(item.bullets)
      return [
        `Role: ${item.role || 'N/A'}`,
        `Company: ${item.company || 'N/A'}`,
        `Period: ${item.period || 'N/A'}`,
        bullets.length ? `Bullets: ${bullets.join('; ')}` : 'Bullets: none yet',
      ].join('\n')
    })
    .join('\n\n')

export const formatProjectsForAI = (projects = []) =>
  filterFilledProjects(projects)
    .map((item) => {
      const bullets = normalizeProjectBullets(item.bullets)
      const skills = normalizeProjectSkills(item.skills)
      return [
        `Project: ${item.name}`,
        skills.length ? `Skills: ${skills.join(', ')}` : 'Skills: none yet',
        bullets.length ? `Bullets: ${bullets.join('; ')}` : 'Bullets: none yet',
      ].join('\n')
    })
    .join('\n\n')

export const formatEducationsForAI = (educations = []) =>
  filterFilledEducations(educations)
    .map((item) =>
      [
        `Degree: ${item.degree || 'N/A'}`,
        `Short: ${item.shortName || 'N/A'}`,
        `Institution: ${item.institution || 'N/A'}`,
        `Period: ${item.period || 'N/A'}`,
        `Grade: ${item.grade || 'N/A'}`,
      ].join('\n'),
    )
    .join('\n\n')

export const mergeParsedExperiences = (current = [], parsed = []) => {
  const filled = filterFilledExperiences(current)
  if (!Array.isArray(parsed) || !parsed.length) return filled
  return parsed.map((item, index) => ({
    id: filled[index]?.id || item.id || createResumeId(),
    role: item.role || item.title || filled[index]?.role || '',
    company: item.company || filled[index]?.company || '',
    period: item.period || item.dates || filled[index]?.period || '',
    bullets: normalizeBullets(item.bullets?.length ? item.bullets : filled[index]?.bullets || []),
  }))
}

export const mergeParsedProjects = (current = [], parsed = []) => {
  const filled = filterFilledProjects(current)
  if (!Array.isArray(parsed) || !parsed.length) return filled
  return parsed.map((item, index) => ({
    id: filled[index]?.id || item.id || createResumeId(),
    name: item.name || item.title || filled[index]?.name || '',
    skills: normalizeProjectSkills(
      item.skills?.length ? item.skills : filled[index]?.skills || [],
    ),
    bullets: normalizeProjectBullets(item.bullets?.length ? item.bullets : filled[index]?.bullets || []),
  }))
}

export const appendParsedExperiences = (current = [], parsed = []) => {
  const incoming = normalizeExperiences(Array.isArray(parsed) ? parsed : [])
    .filter(hasExperienceContent)
    .map((item) => ({ ...item, id: createResumeId() }))
  const filled = filterFilledExperiences(current)
  return filled.length ? [...filled, ...incoming] : incoming.length ? incoming : [emptyExperience()]
}

export const appendParsedProjects = (current = [], parsed = []) => {
  const incoming = normalizeProjects(Array.isArray(parsed) ? parsed : [])
    .filter(hasProjectContent)
    .map((item) => ({ ...item, id: createResumeId() }))
  const filled = filterFilledProjects(current)
  return filled.length ? [...filled, ...incoming] : incoming.length ? incoming : [emptyProject()]
}

export const appendParsedEducations = (current = [], parsed = []) => {
  const incoming = normalizeEducations(Array.isArray(parsed) ? parsed : [])
    .filter(hasEducationContent)
    .map((item) => ({ ...item, id: createResumeId() }))
  const filled = filterFilledEducations(current)
  return filled.length ? [...filled, ...incoming] : incoming.length ? incoming : [emptyEducation()]
}

export const hasResumeContent = ({
  resume,
  jobDescription = '',
  skillsText = '',
  contact,
  experiences = [],
  projects = [],
  educations = [],
}) => {
  if (jobDescription?.trim()) return true
  if (resume?.about?.trim()) return true
  if (resume?.role?.trim()) return true
  if (skillsText?.trim()) return true
  if (filterFilledExperiences(experiences).length) return true
  if (filterFilledProjects(projects).length) return true
  if (filterFilledEducations(educations).length) return true

  const normalizedContact = normalizeContact(contact || resume?.contact)
  if (
    normalizedContact.email?.trim() ||
    normalizedContact.phone?.trim() ||
    normalizedContact.linkedin?.trim() ||
    normalizedContact.location?.trim()
  ) {
    return true
  }

  return false
}
