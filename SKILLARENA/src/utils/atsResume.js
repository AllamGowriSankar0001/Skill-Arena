import { parseSkills } from './resumeSkills'
import { formatSkillGroupsPlainText, groupSkillsByCategory } from './skillCategories'
import {
  filterFilledEducations,
  filterFilledExperiences,
  filterFilledProjects,
  formatContactLine,
  mergeParsedExperiences,
  mergeParsedProjects,
  normalizeBullets,
  normalizeContact,
  normalizeEducations,
  normalizeExperiences,
  normalizeProjectBullets,
  normalizeProjectSkills,
  normalizeProjects,
} from './resumeStructured'

export const parseAtsResumeOutput = (output) => {
  if (!output) return null
  try {
    const cleaned = output.replace(/```json|```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

export const buildAtsResume = ({
  resume,
  contact,
  experiences = [],
  projects = [],
  educations = [],
  skillsText = '',
  skillItems = [],
  parsed = null,
}) => {
  const skillsSource = parsed?.skills
    ? Array.isArray(parsed.skills)
      ? parsed.skills.join(', ')
      : parsed.skills
    : skillsText

  const parsedSkillNames = parseSkills(skillsSource)
  const nextSkills = skillItems.length
    ? skillItems
    : parsedSkillNames.map((name) => ({ name, matched: true }))

  const nextExperiences = parsed?.experience
    ? mergeParsedExperiences(experiences, Array.isArray(parsed.experience) ? parsed.experience : [])
    : filterFilledExperiences(normalizeExperiences(experiences))

  const nextProjects = parsed?.projects
    ? mergeParsedProjects(projects, Array.isArray(parsed.projects) ? parsed.projects : [])
    : filterFilledProjects(normalizeProjects(projects)).map((item) => ({
        ...item,
        bullets: normalizeProjectBullets(item.bullets),
        skills: normalizeProjectSkills(item.skills),
      }))

  return {
    name: resume?.name?.trim() || '',
    role: resume?.role?.trim() || '',
    contact: normalizeContact(contact || resume?.contact),
    summary: (parsed?.summary || resume?.about || '').trim(),
    skills: nextSkills,
    skillGroups: [],
    experiences: nextExperiences.map((item) => ({
      ...item,
      bullets: normalizeBullets(item.bullets),
    })),
    projects: nextProjects,
    educations: filterFilledEducations(normalizeEducations(educations)),
  }
}

export const getAtsSections = (ats) => {
  const sections = []

  if (ats.summary) {
    sections.push({ key: 'summary', title: 'Professional Summary', content: ats.summary, type: 'text' })
  }
  if (ats.skills.length) {
    const skillGroups = ats.skillGroups?.length ? ats.skillGroups : groupSkillsByCategory(ats.skills)
    sections.push({
      key: 'skills',
      title: 'Skills',
      content: skillGroups,
      type: 'skill-categories',
      hasUnmatched: ats.skills.some((skill) => !skill.matched),
    })
  }
  if (ats.experiences.length) {
    sections.push({ key: 'experience', title: 'Work Experience', content: ats.experiences, type: 'experience' })
  }
  if (ats.projects.length) {
    sections.push({ key: 'projects', title: 'Projects', content: ats.projects, type: 'projects' })
  }
  if (ats.educations.length) {
    sections.push({ key: 'education', title: 'Education', content: ats.educations, type: 'education' })
  }

  return sections
}

const formatEducationLine = (edu) => {
  const degreeLabel = edu.shortName ? `${edu.degree} (${edu.shortName})` : edu.degree
  return [
    `${degreeLabel}${edu.period ? ` | ${edu.period}` : ''}`,
    `${edu.institution || ''}${edu.grade ? ` | ${edu.grade}` : ''}`.trim(),
  ].filter(Boolean)
}

export const formatAtsPlainText = (ats) => {
  const lines = []

  if (ats.name) lines.push(ats.name.toUpperCase())
  if (ats.role) lines.push(ats.role)
  const contactLine = formatContactLine(ats.contact)
  if (contactLine) lines.push(contactLine)
  if (lines.length) lines.push('')

  if (ats.summary) {
    lines.push('PROFESSIONAL SUMMARY')
    lines.push(ats.summary)
    lines.push('')
  }

  if (ats.skills.length) {
    lines.push('SKILLS')
    const skillGroups = ats.skillGroups?.length ? ats.skillGroups : groupSkillsByCategory(ats.skills)
    formatSkillGroupsPlainText(skillGroups)
      .split('\n')
      .forEach((line) => lines.push(line))
    lines.push('')
  }

  if (ats.experiences.length) {
    lines.push('WORK EXPERIENCE')
    ats.experiences.forEach((item) => {
      lines.push(`${item.role}${item.company ? ` — ${item.company}` : ''}${item.period ? ` | ${item.period}` : ''}`)
      item.bullets.forEach((bullet) => lines.push(`• ${bullet}`))
      lines.push('')
    })
  }

  if (ats.projects.length) {
    lines.push('PROJECTS')
    ats.projects.forEach((item) => {
      lines.push(item.name)
      const skills = normalizeProjectSkills(item.skills)
      if (skills.length) lines.push(skills.join(', '))
      item.bullets.forEach((bullet) => lines.push(`• ${bullet}`))
      lines.push('')
    })
  }

  if (ats.educations.length) {
    lines.push('EDUCATION')
    ats.educations.forEach((edu) => {
      const degreeLabel = edu.shortName ? `${edu.degree} (${edu.shortName})` : edu.degree
      lines.push(`${degreeLabel}${edu.period ? ` | ${edu.period}` : ''}`)
      if (edu.institution || edu.grade) {
        lines.push(`${edu.institution || ''}${edu.grade ? ` | ${edu.grade}` : ''}`.trim())
      }
      lines.push('')
    })
  }

  return lines.join('\n').trim()
}

export const downloadAtsResume = (ats, filename = 'resume-ats.txt') => {
  const text = formatAtsPlainText(ats)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export const slugifyFilename = (name) =>
  (name || 'resume')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'resume'

export const formatEducationDegree = (edu) =>
  edu.shortName?.trim() ? `${edu.degree} (${edu.shortName})` : edu.degree
