import { createResumeId, normalizeProjectSkills } from './resumeStructured'

export const GENDER_OPTIONS = [
  { value: '', label: 'Select gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

export const emptyProfileProject = () => ({
  id: createResumeId(),
  name: '',
  skillsText: '',
  bulletsText: '',
})

export const emptyCertification = () => ({
  id: createResumeId(),
  name: '',
  issuer: '',
  year: '',
  url: '',
})

export const emptyResumeProfileForm = () => ({
  dateOfBirth: '',
  gender: '',
  phone: '',
  githubUrl: '',
  portfolioUrl: '',
  linkedinUrl: '',
  skillsText: '',
  projects: [emptyProfileProject()],
  certifications: [emptyCertification()],
})

export const resumeProfileToForm = (profile = {}) => ({
  dateOfBirth: profile.dateOfBirth || '',
  gender: profile.gender || '',
  phone: profile.phone || '',
  githubUrl: profile.githubUrl || '',
  portfolioUrl: profile.portfolioUrl || '',
  linkedinUrl: profile.linkedinUrl || '',
  skillsText: (profile.skills || []).join(', '),
  projects: profile.projects?.length
    ? profile.projects.map((item) => ({
        id: item.id || createResumeId(),
        name: item.name || '',
        skillsText: (item.skills || []).join(', '),
        bulletsText: (item.bullets || []).join('\n'),
      }))
    : [emptyProfileProject()],
  certifications: profile.certifications?.length
    ? profile.certifications.map((item) => ({
        id: item.id || createResumeId(),
        name: item.name || '',
        issuer: item.issuer || '',
        year: item.year || '',
        url: item.url || '',
      }))
    : [emptyCertification()],
})

const parseBullets = (text = '') =>
  String(text)
    .split('\n')
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)

export const formToResumeProfile = (form) => ({
  dateOfBirth: form.dateOfBirth?.trim() || '',
  gender: form.gender || '',
  phone: form.phone?.trim() || '',
  githubUrl: form.githubUrl?.trim() || '',
  portfolioUrl: form.portfolioUrl?.trim() || '',
  linkedinUrl: form.linkedinUrl?.trim() || '',
  skills: normalizeProjectSkills(form.skillsText),
  projects: form.projects
    .map((item) => ({
      id: item.id,
      name: item.name?.trim() || '',
      skills: normalizeProjectSkills(item.skillsText),
      bullets: parseBullets(item.bulletsText),
      description: parseBullets(item.bulletsText).join('\n'),
    }))
    .filter((item) => item.name || item.skills.length || item.bullets.length),
  certifications: form.certifications
    .map((item) => ({
      id: item.id,
      name: item.name?.trim() || '',
      issuer: item.issuer?.trim() || '',
      year: item.year?.trim() || '',
      url: item.url?.trim() || '',
    }))
    .filter((item) => item.name || item.issuer || item.year || item.url),
})

const hasMeaningfulProject = (project = {}) =>
  Boolean(
    project.name?.trim() &&
      (project.bullets?.length > 0 ||
        String(project.description || '')
          .trim()
          .split('\n')
          .some((line) => line.trim())),
  )

export const getResumeProfileCompletion = (user) => {
  const profile = user?.resumeProfile || {}

  const items = [
    { label: 'Mobile number', filled: Boolean(profile.phone?.trim()) },
    { label: 'Date of birth', filled: Boolean(profile.dateOfBirth?.trim()) },
    { label: 'Gender', filled: Boolean(profile.gender) },
    { label: 'GitHub profile', filled: Boolean(profile.githubUrl?.trim()) },
    { label: 'Portfolio link', filled: Boolean(profile.portfolioUrl?.trim()) },
    { label: 'LinkedIn profile', filled: Boolean(profile.linkedinUrl?.trim()) },
    { label: 'Skills', filled: Boolean(profile.skills?.length) },
    {
      label: 'Project with details',
      filled: (profile.projects || []).some(hasMeaningfulProject),
    },
    {
      label: 'Certification',
      filled: (profile.certifications || []).some((cert) => cert.name?.trim()),
    },
  ]

  const filledCount = items.filter((item) => item.filled).length
  const totalCount = items.length
  const percent = Math.round((filledCount / totalCount) * 100)
  const missing = items.filter((item) => !item.filled).map((item) => item.label)

  return {
    percent,
    filledCount,
    totalCount,
    missing,
    isComplete: percent === 100,
  }
}
