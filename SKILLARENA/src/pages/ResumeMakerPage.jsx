import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AtsResumeDocument, AtsResumeDocumentModal } from '../components/resume/AtsResumeDocument'
import { resumeApi } from '../services/api'
import { ROUTES } from '../routes'
import {
  buildAtsResume,
  getAtsSections,
  parseAtsResumeOutput,
} from '../utils/atsResume'
import { downloadAtsResumePdf, warmAtsResumePdf } from '../utils/atsResumePdf'
import { extractTextFromPdf } from '../utils/extractPdfText'
import { requestSkillCategoryGroups } from '../utils/skillCategories'
import { isAiRateLimitError, isAiKeyRequiredError, parseAiRetrySeconds, formatAiBusyMessage } from '../utils/aiRateLimit'
import {
  buildSkillItems,
  hasUnmatchedSkills,
  joinSkills,
  mergeSkillItems,
  mergeSkills,
  mergeProjectSkillNames,
  mergeSuggestedSkillNames,
  parseJobSkillsResponse,
  finalizeSuggestedSkillNames,
  parseSkillItemsFromSections,
  parseSkills,
  SKILL_MISMATCH_COLOR,
  SKILL_MISMATCH_LEGEND,
  skillItemsToText,
} from '../utils/resumeSkills'
import {
  appendParsedEducations,
  appendParsedExperiences,
  appendParsedProjects,
  emptyContact,
  emptyEducation,
  emptyExperience,
  emptyProject,
  filterFilledEducations,
  filterFilledExperiences,
  filterFilledProjects,
  formatContactLine,
  formatEducationsForAI,
  formatExperienceForAI,
  formatProjectsForAI,
  hasResumeContent,
  hasEducationContent,
  hasExperienceContent,
  hasProjectContent,
  mergeParsedExperiences,
  mergeParsedProjects,
  migrateEducationsFromText,
  migrateExperiencesFromText,
  migrateProjectsFromText,
  normalizeContact,
  normalizeEducations,
  normalizeExperiences,
  normalizeProjectBullets,
  normalizeProjectSkills,
  normalizeProjects,
} from '../utils/resumeStructured'
import './ResumeMakerPage.css'

const WIZARD_STEPS = [
  { key: 'job', title: 'Job description', hint: 'Paste the role description you want to target.' },
  { key: 'profile', title: 'Your profile', hint: 'Enter your name and confirm the headline.' },
  { key: 'contact', title: 'Contact details', hint: 'Add email, phone, LinkedIn, and location for your resume.' },
  { key: 'experience', title: 'Work experience', hint: 'Add each role with company name and time period.' },
  { key: 'projects', title: 'Projects', hint: 'Add projects with skills used and 2–4 bullet points each.' },
  { key: 'skills', title: 'Skills', hint: 'One-click AI suggests skills as tags. Add or remove any skill.' },
  { key: 'education', title: 'Education', hint: 'Add each degree with institution, period, and CGPA/marks.' },
  { key: 'generate', title: 'Generate resume', hint: 'AI builds an ATS-friendly resume using only your details.' },
]

const getSkillsText = (sections) => {
  const section = sections?.find((item) => item.type === 'skills')
  const items = section?.data?.items || []
  return items.map((item) => (typeof item === 'string' ? item : item.name || item.text || '')).join(', ')
}

const applySections = (sections, { skillItems, experiences, projects }) => {
  const skillsItems = skillItems.map((item) => ({ name: item.name, matched: item.matched }))

  const experienceItems = filterFilledExperiences(experiences).map((item) => ({
    title: item.role,
    company: item.company,
    period: item.period,
    description: item.bullets.join('\n'),
  }))

  const projectItems = filterFilledProjects(projects).map((item) => ({
    title: item.name,
    skills: item.skills || [],
    description: item.bullets.join('\n'),
  }))

  const ensure = (type, title, data) => {
    const existing = sections.find((section) => section.type === type)
    if (existing) {
      return sections.map((section) =>
        section.type === type ? { ...section, data: { ...section.data, ...data } } : section,
      )
    }
    return [...sections, { id: type, type, title, data }]
  }

  let next = sections?.length ? [...sections] : []
  next = ensure('skills', 'Skills', { items: skillsItems })
  next = ensure('experience', 'Work Experience', { items: experienceItems })
  next = ensure('projects', 'Projects', { items: projectItems })
  return next
}

const ResumeMakerPage = ({ adminMode = false }) => {
  const [resume, setResume] = useState(null)
  const [skillItems, setSkillItems] = useState([])
  const skillsText = useMemo(() => skillItemsToText(skillItems), [skillItems])
  const [jobDescription, setJobDescription] = useState('')
  const [contact, setContact] = useState(emptyContact())
  const [experiences, setExperiences] = useState([emptyExperience()])
  const [projects, setProjects] = useState([emptyProject()])
  const [educations, setEducations] = useState([emptyEducation()])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [aiLoading, setAiLoading] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [wizardOpen, setWizardOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [newSkill, setNewSkill] = useState('')
  const [atsResume, setAtsResume] = useState(null)
  const [atsModalOpen, setAtsModalOpen] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [skillCategoryGroups, setSkillCategoryGroups] = useState([])
  const lastSkillCategoryKey = useRef('')
  const [experiencePaste, setExperiencePaste] = useState('')
  const [projectsPaste, setProjectsPaste] = useState('')
  const [educationPaste, setEducationPaste] = useState('')
  const [projectSkillsLoadingId, setProjectSkillsLoadingId] = useState('')
  const [retryCountdown, setRetryCountdown] = useState(0)
  const [skillsRetryCountdown, setSkillsRetryCountdown] = useState(0)
  const [optimizeModalOpen, setOptimizeModalOpen] = useState(false)
  const [optimizeResumeText, setOptimizeResumeText] = useState('')
  const [optimizeJobDescription, setOptimizeJobDescription] = useState('')
  const [optimizeError, setOptimizeError] = useState('')

  const hydrateStructured = (data) => {
    const nextExperiences = data.experiences?.length
      ? normalizeExperiences(data.experiences)
      : migrateExperiencesFromText(
          data.sections
            ?.find((item) => item.type === 'experience')
            ?.data?.items?.map((item) =>
              typeof item === 'string' ? item : [item.title, item.company, item.period].filter(Boolean).join(' — '),
            )
            .join('\n') || '',
        )

    const nextProjects = data.projects?.length
      ? normalizeProjects(data.projects)
      : migrateProjectsFromText(data.projectsText || '')

    const nextEducations = data.educations?.length
      ? normalizeEducations(data.educations)
      : migrateEducationsFromText(data.educationText || '')

    setContact(normalizeContact(data.contact))
    setExperiences(nextExperiences)
    setProjects(nextProjects)
    setEducations(nextEducations)
    return { nextExperiences, nextProjects, nextEducations }
  }

  const applyFreshResume = (data) => {
    setResume(data)
    setSkillItems([])
    setJobDescription('')
    setContact(emptyContact())
    setExperiences([emptyExperience()])
    setProjects([emptyProject()])
    setEducations([emptyEducation()])
    setAtsResume(null)
    setAtsModalOpen(false)
    setWizardOpen(false)
    setStepIndex(0)
    setExperiencePaste('')
    setProjectsPaste('')
    setEducationPaste('')
    setNewSkill('')
    setError('')
  }

  const loadResume = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await resumeApi.getMine()
      setResume(data.resume)
      setSkillItems(parseSkillItemsFromSections(data.resume.sections))
      setJobDescription(data.resume.jobDescription || '')
      const structured = hydrateStructured(data.resume)
      const saved = hasResumeContent({
        resume: data.resume,
        jobDescription: data.resume.jobDescription,
        skillsText: skillItemsToText(parseSkillItemsFromSections(data.resume.sections)),
        contact: data.resume.contact,
        experiences: structured.nextExperiences,
        projects: structured.nextProjects,
        educations: structured.nextEducations,
      })
      if (saved) {
        setAtsResume(
          buildAtsResume({
            resume: data.resume,
            contact: data.resume.contact,
            experiences: structured.nextExperiences,
            projects: structured.nextProjects,
            educations: structured.nextEducations,
            skillItems: parseSkillItemsFromSections(data.resume.sections),
            skillsText: skillItemsToText(parseSkillItemsFromSections(data.resume.sections)),
          }),
        )
      } else {
        setAtsResume(null)
      }
    } catch (err) {
      setError(err.message || 'Failed to load resume')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadResume()
  }, [loadResume])

  useEffect(() => {
    if (!retryCountdown) return undefined
    const timer = window.setInterval(() => {
      setRetryCountdown((current) => (current <= 1 ? 0 : current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [retryCountdown])

  useEffect(() => {
    if (!skillsRetryCountdown) return undefined
    const timer = window.setInterval(() => {
      setSkillsRetryCountdown((current) => (current <= 1 ? 0 : current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [skillsRetryCountdown])

  const buildPayload = () => {
    if (!resume) return null
    const filledExperiences = filterFilledExperiences(experiences)
    const filledProjects = filterFilledProjects(projects)
    const filledEducations = filterFilledEducations(educations)

    return {
      ...resume,
      jobDescription,
      contact,
      experiences: filledExperiences,
      projects: filledProjects.map((item) => ({
        ...item,
        bullets: normalizeProjectBullets(item.bullets),
        skills: normalizeProjectSkills(item.skills),
      })),
      educations: filledEducations,
      projectsText: filledProjects.map((item) => item.name).join('\n'),
      educationText: filledEducations
        .map((item) => [item.degree, item.institution, item.period, item.grade].filter(Boolean).join(' — '))
        .join('\n'),
      sections: applySections(resume.sections, { skillItems, experiences, projects }),
    }
  }

  const handleSave = async () => {
    const payload = buildPayload()
    if (!payload) return
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const data = await resumeApi.saveMine(payload)
      setResume(data.resume)
      setSkillItems(parseSkillItemsFromSections(data.resume.sections))
      setJobDescription(data.resume.jobDescription || '')
      hydrateStructured(data.resume)
      setMessage('Resume saved.')
    } catch (err) {
      setError(err.message || 'Failed to save resume')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteResume = async () => {
    if (!window.confirm('Delete your resume? This clears all saved details so you can start a new one.')) {
      return
    }
    setDeleting(true)
    setMessage('')
    setError('')
    try {
      const data = await resumeApi.deleteMine()
      applyFreshResume(data.resume)
      setMessage(data.message || 'Resume deleted. Start a new resume with the wizard.')
    } catch (err) {
      setError(err.message || 'Failed to delete resume')
    } finally {
      setDeleting(false)
    }
  }

  const runAISilent = useCallback(
    async (type, extra = {}) => {
      const payload = buildPayload()
      if (!payload) return null
      try {
        const data = await resumeApi.generateAI({
          type,
          context: extra.context ?? jobDescription,
          state: {
            ...payload,
            skillsText,
            contact,
            experienceSummary: formatExperienceForAI(experiences),
            projectsSummary: formatProjectsForAI(projects),
            educationSummary: formatEducationsForAI(educations),
            jobDescription,
            ...extra.state,
          },
        })
        return data.output
      } catch {
        return null
      }
    },
    [resume, jobDescription, skillsText, contact, experiences, projects, educations, skillItems],
  )

  const categorizeSkills = useCallback(
    async (items) => requestSkillCategoryGroups(runAISilent, items, { jobDescription }),
    [runAISilent, jobDescription],
  )

  const categorizeSkillsRef = useRef(categorizeSkills)
  categorizeSkillsRef.current = categorizeSkills

  const runAI = async (type, extra = {}) => {
    const basePayload = extra.forceState || buildPayload()
    if (!basePayload) return null
    setAiLoading(type)
    setError('')
    try {
      const data = await resumeApi.generateAI({
        type,
        context: extra.context ?? jobDescription,
        state: {
          ...basePayload,
          skillsText: basePayload.skillsText ?? skillsText,
          contact: basePayload.contact ?? contact,
          experienceSummary:
            basePayload.experienceSummary ?? formatExperienceForAI(experiences),
          projectsSummary: basePayload.projectsSummary ?? formatProjectsForAI(projects),
          educationSummary: basePayload.educationSummary ?? formatEducationsForAI(educations),
          ...extra.state,
        },
      })
      return data.output
    } catch (err) {
      if (isAiRateLimitError(err)) {
        const retrySeconds = parseAiRetrySeconds(err)
        if (type === 'build_resume') {
          setRetryCountdown(retrySeconds)
          setError('')
        } else if (type === 'parse_resume') {
          setError(formatAiBusyMessage(retrySeconds))
        } else if (type === 'job_skills' || type === 'project_skills') {
          setSkillsRetryCountdown(retrySeconds)
          setError(formatAiBusyMessage(retrySeconds))
        } else {
          setError(formatAiBusyMessage(retrySeconds))
        }
        return null
      }
      if (isAiKeyRequiredError(err)) {
        setError('Add a Gemini or ChatGPT API key in your Profile settings, then try again.')
        return null
      }
      setError(err.message || 'AI request failed')
      return null
    } finally {
      setAiLoading('')
    }
  }

  const openWizard = () => {
    setStepIndex(0)
    setWizardOpen(true)
    setError('')
    setMessage('')
  }

  const buildResumeTextFromState = () => {
    const lines = []
    if (resume?.name?.trim()) lines.push(resume.name.trim())
    if (resume?.role?.trim()) lines.push(`Headline: ${resume.role.trim()}`)
    const contactLine = formatContactLine(contact)
    if (contactLine) lines.push(contactLine)
    if (resume?.about?.trim()) {
      lines.push('')
      lines.push('Summary')
      lines.push(resume.about.trim())
    }
    const filledExperiences = filterFilledExperiences(experiences)
    if (filledExperiences.length) {
      lines.push('')
      lines.push('Experience')
      filledExperiences.forEach((item) => {
        lines.push(`${item.role} — ${item.company} (${item.period})`)
        item.bullets.forEach((bullet) => lines.push(`- ${bullet}`))
      })
    }
    const filledProjects = filterFilledProjects(projects)
    if (filledProjects.length) {
      lines.push('')
      lines.push('Projects')
      filledProjects.forEach((item) => {
        lines.push(item.name)
        if (item.skills?.length) lines.push(`Skills: ${item.skills.join(', ')}`)
        item.bullets.forEach((bullet) => lines.push(`- ${bullet}`))
      })
    }
    if (skillsText.trim()) {
      lines.push('')
      lines.push(`Skills: ${skillsText}`)
    }
    const filledEducations = filterFilledEducations(educations)
    if (filledEducations.length) {
      lines.push('')
      lines.push('Education')
      filledEducations.forEach((item) => {
        lines.push(
          [item.degree, item.institution, item.period, item.grade].filter(Boolean).join(' — '),
        )
      })
    }
    return lines.join('\n')
  }

  const openOptimizeModal = () => {
    setOptimizeResumeText(hasResume ? buildResumeTextFromState() : '')
    setOptimizeJobDescription(jobDescription)
    setOptimizeError('')
    setOptimizeModalOpen(true)
  }

  const handleResumeFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
    if (!isPdf) {
      setOptimizeError('Upload a PDF file or paste your resume below.')
      event.target.value = ''
      return
    }

    try {
      const text = await extractTextFromPdf(file)
      if (!text) {
        setOptimizeError('No text found in that PDF. Try a different file or paste your resume.')
        return
      }
      setOptimizeResumeText(text)
      setOptimizeError('')
    } catch {
      setOptimizeError('Could not read that PDF. Try a different file or paste your resume instead.')
    } finally {
      event.target.value = ''
    }
  }

  const applyOptimizedOutput = async (output, source) => {
    const parsed = parseAtsResumeOutput(output)
    if (!parsed) {
      setError('Could not read AI resume output.')
      return false
    }

    const nextAbout = parsed?.summary || source.resume?.about || ''
    const nextExperiences = parsed?.experience
      ? mergeParsedExperiences(source.experiences, parsed.experience)
      : filterFilledExperiences(source.experiences)
    const nextProjects = parsed?.projects
      ? mergeParsedProjects(source.projects, parsed.projects)
      : filterFilledProjects(source.projects)
    const nextSkillItems = parsed?.skills
      ? mergeSkillItems(
          source.skillItems,
          Array.isArray(parsed.skills) ? parsed.skills : parseSkills(String(parsed.skills)),
          nextExperiences,
          nextProjects,
        )
      : source.skillItems

    setResume((current) => (current ? { ...current, about: nextAbout } : current))
    setSkillItems(nextSkillItems)
    setExperiences(nextExperiences.length ? nextExperiences : [emptyExperience()])
    setProjects(nextProjects.length ? nextProjects : [emptyProject()])

    const groups = await categorizeSkills(nextSkillItems)
    setSkillCategoryGroups(groups)
    lastSkillCategoryKey.current = JSON.stringify(nextSkillItems.map((item) => item.name))

    const ats = buildAtsResume({
      resume: { ...source.resume, about: nextAbout, role: source.resume?.role },
      contact: source.contact,
      experiences: nextExperiences,
      projects: nextProjects,
      educations: source.educations,
      skillItems: nextSkillItems,
      parsed,
    })

    setAtsResume({ ...ats, skillGroups: groups })
    setWizardOpen(false)
    setAtsModalOpen(true)
    setMessage('ATS resume ready. Save or download below.')
    setError('')
    return true
  }

  const handleGenerateResume = async () => {
    const output = await runAI('build_resume')
    if (!output) return
    await applyOptimizedOutput(output, {
      resume,
      contact,
      experiences,
      projects,
      educations,
      skillItems,
    })
  }

  const handleOptimizeFromModal = async (event) => {
    event.preventDefault()
    const jd = optimizeJobDescription.trim()
    const resumeText = optimizeResumeText.trim() || (hasResume ? buildResumeTextFromState() : '')

    if (!resumeText) {
      setOptimizeError('Paste your resume or upload a PDF file.')
      return
    }
    if (!jd) {
      setOptimizeError('Paste the job description you want to target.')
      return
    }

    setOptimizeError('')
    setOptimizeModalOpen(false)
    setJobDescription(jd)

    const parseOutput = await runAI('parse_resume', {
      context: resumeText,
      forceState: {
        name: resume?.name || '',
        role: resume?.role || '',
        about: resume?.about || '',
        jobDescription: jd,
        resumeText,
        skillsText: '',
        contact,
        experienceSummary: '',
        projectsSummary: '',
        educationSummary: '',
        sections: resume?.sections || [],
      },
    })
    if (!parseOutput) return

    const parsedProfile = parseAtsResumeOutput(parseOutput)
    if (!parsedProfile) {
      setError('Could not parse your resume. Try formatting it more clearly.')
      return
    }

    const nextResume = {
      ...resume,
      name: parsedProfile.name?.trim() || resume?.name || '',
      role: parsedProfile.role?.trim() || resume?.role || '',
      about: parsedProfile.about?.trim() || parsedProfile.summary?.trim() || resume?.about || '',
      jobDescription: jd,
    }
    const nextContact = normalizeContact(parsedProfile.contact || contact)
    const nextExperiences = parsedProfile.experience?.length
      ? mergeParsedExperiences([emptyExperience()], parsedProfile.experience)
      : filterFilledExperiences(experiences)
    const nextProjects = parsedProfile.projects?.length
      ? mergeParsedProjects([emptyProject()], parsedProfile.projects)
      : filterFilledProjects(projects)
    const nextEducations = parsedProfile.education?.length
      ? appendParsedEducations([emptyEducation()], parsedProfile.education)
      : filterFilledEducations(educations)
    const nextSkillItems = parsedProfile.skills
      ? mergeSkillItems(
          [],
          Array.isArray(parsedProfile.skills) ? parsedProfile.skills : parseSkills(String(parsedProfile.skills)),
          nextExperiences,
          nextProjects,
        )
      : skillItems

    setResume(nextResume)
    setContact(nextContact)
    setExperiences(nextExperiences.length ? nextExperiences : [emptyExperience()])
    setProjects(nextProjects.length ? nextProjects : [emptyProject()])
    setEducations(nextEducations.length ? nextEducations : [emptyEducation()])
    setSkillItems(nextSkillItems)

    const filledExperiences = filterFilledExperiences(nextExperiences)
    const filledProjects = filterFilledProjects(nextProjects).map((item) => ({
      ...item,
      bullets: normalizeProjectBullets(item.bullets),
      skills: normalizeProjectSkills(item.skills),
    }))
    const filledEducations = filterFilledEducations(nextEducations)

    const buildOutput = await runAI('build_resume', {
      context: jd,
      forceState: {
        ...nextResume,
        jobDescription: jd,
        contact: nextContact,
        experiences: filledExperiences,
        projects: filledProjects,
        educations: filledEducations,
        skillsText: skillItemsToText(nextSkillItems),
        experienceSummary: formatExperienceForAI(nextExperiences),
        projectsSummary: formatProjectsForAI(nextProjects),
        educationSummary: formatEducationsForAI(nextEducations),
        sections: applySections(resume?.sections || [], {
          skillItems: nextSkillItems,
          experiences: nextExperiences,
          projects: nextProjects,
        }),
      },
    })
    if (!buildOutput) return

    await applyOptimizedOutput(buildOutput, {
      resume: nextResume,
      contact: nextContact,
      experiences: nextExperiences,
      projects: nextProjects,
      educations: nextEducations,
      skillItems: nextSkillItems,
    })
  }

  const validateStep = (step) => {
    if (step.key === 'job' && !jobDescription.trim()) return 'Paste a job description to continue.'
    if (step.key === 'profile' && !resume?.name?.trim()) return 'Enter your full name to continue.'
    if (step.key === 'contact' && !contact.email.trim()) return 'Enter your email to continue.'
    if (step.key === 'experience') {
      const invalid = experiences.find(
        (item) => hasExperienceContent(item) && (!item.role.trim() || !item.company.trim() || !item.period.trim()),
      )
      if (invalid) return 'Each experience needs role, company, and time period.'
    }
    if (step.key === 'projects') {
      const invalid = projects.find((item) => {
        if (!hasProjectContent(item)) return false
        const bullets = normalizeProjectBullets(item.bullets)
        return bullets.length < 2 || bullets.length > 4
      })
      if (invalid) return 'Each project needs a name and 2–4 bullet points.'
    }
    if (step.key === 'education') {
      const invalid = educations.find(
        (item) =>
          hasEducationContent(item) &&
          (!item.degree.trim() || !item.institution.trim() || !item.period.trim()),
      )
      if (invalid) return 'Each education entry needs degree, institution, and period.'
    }
    return ''
  }

  const goNext = async () => {
    const step = WIZARD_STEPS[stepIndex]
    const validationError = validateStep(step)
    if (validationError) {
      setError(validationError)
      return
    }

    if (step.key === 'profile' && !resume?.role?.trim()) {
      const headline = await runAI('job_headline', { context: jobDescription })
      if (headline) {
        setResume((current) => (current ? { ...current, role: headline.trim() } : current))
      }
    }

    if (step.key === 'generate') {
      await handleGenerateResume()
      return
    }

    setError('')
    setStepIndex((current) => Math.min(current + 1, WIZARD_STEPS.length - 1))
  }

  const goBack = () => {
    setError('')
    setStepIndex((current) => Math.max(current - 1, 0))
  }

  const handleDownloadAts = async () => {
    let doc = previewAts
    if (!doc || downloadingPdf) return
    setDownloadingPdf(true)
    setError('')
    try {
      if (doc.skills.length && !doc.skillGroups?.length) {
        const groups = await categorizeSkills(doc.skills)
        doc = { ...doc, skillGroups: groups }
        setSkillCategoryGroups(groups)
      }
      await downloadAtsResumePdf(doc)
      setMessage('Resume PDF downloaded.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download resume PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const parseExperienceWithAI = async () => {
    if (!experiencePaste.trim()) {
      setError('Paste your experience text first.')
      return
    }
    const output = await runAI('parse_experience', { context: experiencePaste })
    const parsed = parseAtsResumeOutput(output)
    if (!parsed?.experience?.length) {
      setError('Could not parse experience. Try clearer text with role, company, and dates.')
      return
    }
    setExperiences((current) => appendParsedExperiences(current, parsed.experience))
    setExperiencePaste('')
    setMessage('Experience entries aligned and added.')
    setError('')
  }

  const parseProjectsWithAI = async () => {
    if (!projectsPaste.trim()) {
      setError('Paste your projects text first.')
      return
    }
    const output = await runAI('parse_projects', { context: projectsPaste })
    const parsed = parseAtsResumeOutput(output)
    if (!parsed?.projects?.length) {
      setError('Could not parse projects. Try project names with bullet points.')
      return
    }
    setProjects((current) => appendParsedProjects(current, parsed.projects))
    setProjectsPaste('')
    setMessage('Projects aligned and added with 2–4 bullets each.')
    setError('')
  }

  const parseEducationWithAI = async () => {
    if (!educationPaste.trim()) {
      setError('Paste your education text first.')
      return
    }
    const output = await runAI('parse_education', { context: educationPaste })
    const parsed = parseAtsResumeOutput(output)
    if (!parsed?.education?.length) {
      setError('Could not parse education. Include degree, school, and years.')
      return
    }
    setEducations((current) => appendParsedEducations(current, parsed.education))
    setEducationPaste('')
    setMessage('Education entries aligned and added.')
    setError('')
  }

  const suggestHeadline = async () => {
    const headline = await runAI('job_headline', { context: jobDescription })
    if (headline) {
      setResume((current) => (current ? { ...current, role: headline.trim() } : current))
      setMessage('Headline suggested from the job description.')
    }
  }

  const suggestSkills = async () => {
    const hasJob = Boolean(jobDescription.trim())
    const hasExperience = experiences.some((item) => hasExperienceContent(item))
    const hasProjects = projects.some((item) => hasProjectContent(item))

    if (!hasJob && !hasExperience && !hasProjects) {
      setError('Add a job description, experience, or projects before suggesting skills.')
      return
    }

    const output = await runAI('job_skills', { context: jobDescription })
    if (!output) return

    const parsed = parseJobSkillsResponse(output)
    const mergedSkills = mergeSuggestedSkillNames(
      parsed.skills,
      jobDescription,
      experiences,
      projects,
    )

    const validatedSkills = finalizeSuggestedSkillNames(mergedSkills)

    if (!validatedSkills.length) {
      setError('No valid technical skills were found. Mention specific tools or technologies in your job description, experience, or projects.')
      return
    }

    setSkillItems((current) => mergeSkillItems(current, validatedSkills, experiences, projects))
    setMessage(
      `Added ${validatedSkills.length} validated skills from your job description, experience, and projects. Red tags are job keywords not yet found in your background.`,
    )
    setError('')
  }

  const suggestProjectSkills = async (projectId) => {
    const project = projects.find((item) => item.id === projectId)
    if (!project?.name?.trim()) {
      setError('Add a project name before suggesting skills.')
      return
    }

    const bullets = normalizeProjectBullets(project.bullets)
    if (!bullets.length) {
      setError('Add at least one bullet point before suggesting skills.')
      return
    }

    const projectSummary = formatProjectsForAI([project])
    setProjectSkillsLoadingId(projectId)
    setError('')

    try {
      const output = await runAISilent('project_skills', {
        context: projectSummary,
        state: {
          projectSummary,
          projectsSummary: projectSummary,
        },
      })
      const parsed = output ? parseJobSkillsResponse(output) : { skills: [] }
      const mergedSkills = mergeProjectSkillNames(parsed.skills, project, jobDescription)
      const validatedSkills = finalizeSuggestedSkillNames(mergedSkills)

      if (!validatedSkills.length) {
        setError('No valid technical skills found for this project. Mention tools or technologies in the name or bullets.')
        return
      }

      setProjects((current) =>
        current.map((item) =>
          item.id === projectId
            ? {
                ...item,
                skills: normalizeProjectSkills([...(item.skills || []), ...validatedSkills]),
              }
            : item,
        ),
      )
      setMessage(`Added ${validatedSkills.length} skills for ${project.name}.`)
    } finally {
      setProjectSkillsLoadingId('')
    }
  }

  const hasResume = useMemo(
    () =>
      hasResumeContent({
        resume,
        jobDescription,
        skillsText,
        contact,
        experiences,
        projects,
        educations,
      }),
    [resume, jobDescription, skillsText, contact, experiences, projects, educations],
  )

  const liveAtsResume = useMemo(() => {
    if (!hasResume) return null
    return buildAtsResume({
      resume,
      contact,
      experiences,
      projects,
      educations,
      skillItems,
      skillsText,
    })
  }, [hasResume, resume, contact, experiences, projects, educations, skillItems, skillsText])

  const skillCategoryKey = useMemo(
    () => (skillItems.length ? JSON.stringify(skillItems.map((item) => item.name)) : ''),
    [skillItems],
  )

  useEffect(() => {
    if (!skillCategoryKey) {
      if (lastSkillCategoryKey.current !== '') {
        setSkillCategoryGroups([])
        lastSkillCategoryKey.current = ''
      }
      return undefined
    }
    if (skillCategoryKey === lastSkillCategoryKey.current) return undefined

    const timer = setTimeout(() => {
      const items = skillItems
      categorizeSkillsRef.current(items).then((groups) => {
        setSkillCategoryGroups(groups)
        lastSkillCategoryKey.current = skillCategoryKey
      })
    }, 1200)

    return () => clearTimeout(timer)
  }, [skillCategoryKey, skillItems])

  const basePreviewAts = hasResume ? atsResume || liveAtsResume : null
  const previewAts = useMemo(() => {
    if (!basePreviewAts) return null
    if (!skillCategoryGroups.length) return basePreviewAts
    return { ...basePreviewAts, skillGroups: skillCategoryGroups }
  }, [basePreviewAts, skillCategoryGroups])
  const atsSections = useMemo(() => (previewAts ? getAtsSections(previewAts) : []), [previewAts])

  useEffect(() => {
    if (!previewAts) return undefined
    const delay = atsResume ? 0 : 2000
    const timer = setTimeout(() => warmAtsResumePdf(previewAts), delay)
    return () => clearTimeout(timer)
  }, [previewAts, atsResume])

  const removeSkill = (skill) => setSkillItems((current) => current.filter((item) => item.name !== skill))
  const addSkill = () => {
    const value = newSkill.trim()
    if (!value) return
    setSkillItems((current) => mergeSkillItems(current, [value], experiences, projects))
    setNewSkill('')
  }

  const updateExperience = (id, field, value) => {
    setExperiences((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const updateExperienceBullets = (id, value) => {
    setExperiences((current) =>
      current.map((item) =>
        item.id === id ? { ...item, bullets: value.split('\n').map((line) => line.trim()).filter(Boolean) } : item,
      ),
    )
  }

  const updateProject = (id, field, value) => {
    setProjects((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const updateProjectSkills = (id, value) => {
    setProjects((current) =>
      current.map((item) => (item.id === id ? { ...item, skills: normalizeProjectSkills(value) } : item)),
    )
  }

  const updateProjectBullets = (id, value) => {
    const bullets = value.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 4)
    setProjects((current) => current.map((item) => (item.id === id ? { ...item, bullets } : item)))
  }

  const updateEducation = (id, field, value) => {
    setEducations((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const currentStep = WIZARD_STEPS[stepIndex]
  const filledExperienceCount = filterFilledExperiences(experiences).length
  const filledProjectCount = filterFilledProjects(projects).length
  const filledEducationCount = filterFilledEducations(educations).length

  const resumeActions = (
    <div className="resume-actions-bar">
      <button
        type="button"
        className="resume-btn resume-btn--primary"
        onClick={openOptimizeModal}
        disabled={Boolean(aiLoading) || retryCountdown > 0}
      >
        {aiLoading === 'parse_resume'
          ? 'Reading resume…'
          : aiLoading === 'build_resume'
            ? 'Optimizing…'
            : retryCountdown > 0
              ? `Try again in ${retryCountdown}s`
              : 'Optimize with AI'}
      </button>
      <button type="button" className="resume-btn resume-btn--outline" onClick={openWizard}>
        {hasResume ? 'Edit in wizard' : 'Start resume wizard'}
      </button>
      {hasResume ? (
        <>
          <span className="resume-actions-divider" aria-hidden="true" />
          <button type="button" className="resume-btn resume-btn--secondary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            className="resume-btn resume-btn--outline"
            onClick={handleDownloadAts}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? 'Generating PDF…' : 'Download PDF'}
          </button>
          <span className="resume-actions-divider" aria-hidden="true" />
          <button
            type="button"
            className="resume-btn resume-btn--danger"
            onClick={handleDeleteResume}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete resume'}
          </button>
        </>
      ) : null}
    </div>
  )

  if (loading) {
    return (
      <main className={`resume-page${adminMode ? ' resume-page--admin' : ''}`}>
        <p>Loading resume builder…</p>
      </main>
    )
  }

  return (
    <main className={`resume-page${adminMode ? ' resume-page--admin' : ''}`}>
      {adminMode ? (
        <section className="resume-admin-hero">
          <div className="resume-admin-hero-top">
            <div className="resume-admin-hero-copy">
              <p className="resume-admin-eyebrow">Admin tools</p>
              <h1>AI Resume Maker</h1>
              <p>Test the same resume wizard learners use, then review saved resumes across the platform.</p>
            </div>
            <div className="resume-admin-nav">
              <Link to={ROUTES.adminResumes} className="resume-admin-link-btn">
                View user resumes
              </Link>
              <Link to={ROUTES.admin} className="resume-admin-link-btn resume-admin-link-btn--ghost">
                Back to overview
              </Link>
            </div>
          </div>

          <ol className="resume-admin-workflow" aria-label="How to test the resume builder">
            <li>
              <span className="resume-admin-workflow-num">1</span>
              <div>
                <strong>Start wizard</strong>
                <p>Paste a job description and fill structured profile sections.</p>
              </div>
            </li>
            <li>
              <span className="resume-admin-workflow-num">2</span>
              <div>
                <strong>Generate ATS resume</strong>
                <p>Run AI optimization and preview the tailored output.</p>
              </div>
            </li>
            <li>
              <span className="resume-admin-workflow-num">3</span>
              <div>
                <strong>Review learner saves</strong>
                <p>Check real user resumes from the admin user resumes page.</p>
              </div>
            </li>
          </ol>

          <div className="resume-admin-hero-actions">{resumeActions}</div>
        </section>
      ) : (
        <>
          <div className="resume-page-head">
            <div>
              <p className="resume-eyebrow">Career tools</p>
              <h1>AI Resume Maker</h1>
              <p className="resume-lead">
                Paste a job description, add structured details, and generate an ATS-friendly resume.
              </p>
            </div>
          </div>
          <div className="resume-page-actions">{resumeActions}</div>
        </>
      )}

      <section className="resume-preview-panel">
        {message ? (
          <div className="resume-preview-alert resume-preview-alert--success" role="status">
            {message}
          </div>
        ) : null}
        {!wizardOpen && error && !retryCountdown ? (
          <div className="resume-preview-alert resume-preview-alert--error" role="alert">
            {error}
          </div>
        ) : null}
        {!wizardOpen && retryCountdown > 0 ? (
          <div className="resume-preview-alert resume-preview-alert--busy" role="status" aria-live="polite">
            The server is currently busy. Please try again in{' '}
            <strong>{retryCountdown}</strong> second{retryCountdown === 1 ? '' : 's'}.
          </div>
        ) : null}

        <div className="resume-preview-panel-head">
          <div>
            <p className="resume-preview-label">Resume output</p>
            <h2 className="resume-preview-title">
              {previewAts ? previewAts.name || 'Your resume' : 'Build your ATS resume'}
            </h2>
            <p className="resume-ats-note">
              {previewAts
                ? atsResume
                  ? 'AI-optimized for applicant tracking systems — save or download when ready.'
                  : 'Live draft from your wizard answers — run Optimize with AI to polish every section.'
                : hasResume
                  ? 'Complete the wizard and optimize with AI to generate your tailored resume.'
                  : 'Start the wizard with a job description, then preview a clean ATS-friendly layout here.'}
            </p>
          </div>
          {previewAts ? (
            <div className="resume-preview-meta">
              <span
                className={`resume-status-badge${atsResume ? ' resume-status-badge--optimized' : ' resume-status-badge--draft'}`}
              >
                {atsResume ? 'AI optimized' : 'Live draft'}
              </span>
              <span className="resume-meta-chip">{atsSections.length} sections</span>
            </div>
          ) : null}
        </div>

        {previewAts ? (
          <div className="resume-preview-canvas">
            <AtsResumeDocument ats={previewAts} sections={atsSections} />
          </div>
        ) : (
          <div className="resume-preview-empty">
            <div className="resume-preview-empty-visual" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <h3>No resume preview yet</h3>
            <p className="resume-muted">
              Paste your resume and a job description, then let AI build an ATS-ready version — or use the step-by-step wizard.
            </p>
            <div className="resume-preview-empty-actions">
              <button type="button" className="resume-btn resume-btn--primary" onClick={openOptimizeModal}>
                Optimize with AI
              </button>
              <button type="button" className="resume-btn resume-btn--outline" onClick={openWizard}>
                {hasResume ? 'Open resume wizard' : 'Start resume wizard'}
              </button>
            </div>
          </div>
        )}
      </section>

      {optimizeModalOpen ? (
        <div
          className="resume-wizard-backdrop"
          onClick={() => setOptimizeModalOpen(false)}
          role="presentation"
        >
          <div
            className="resume-optimize-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="resume-optimize-title"
          >
            <div className="resume-optimize-modal-head">
              <div>
                <p className="resume-preview-label">AI resume optimizer</p>
                <h2 id="resume-optimize-title">Optimize with AI</h2>
                <p className="resume-muted">
                  Paste your resume and the job description. We will tailor an ATS-friendly version for that role.
                </p>
              </div>
              <button
                type="button"
                className="resume-wizard-close"
                onClick={() => setOptimizeModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form className="resume-optimize-form" onSubmit={handleOptimizeFromModal}>
              <label className="resume-optimize-upload">
                <span>Upload resume (PDF)</span>
                <input type="file" accept=".pdf,application/pdf" onChange={handleResumeFileUpload} />
              </label>

              <label>
                Your resume
                <textarea
                  value={optimizeResumeText}
                  onChange={(event) => setOptimizeResumeText(event.target.value)}
                  placeholder="Paste your full resume here — experience, projects, skills, education, and contact details."
                  rows={10}
                  required={!hasResume}
                />
              </label>

              <label>
                Job description
                <textarea
                  value={optimizeJobDescription}
                  onChange={(event) => setOptimizeJobDescription(event.target.value)}
                  placeholder="Paste the full job posting you want to target."
                  rows={8}
                  required
                />
              </label>

              {optimizeError ? <p className="resume-error">{optimizeError}</p> : null}

              <div className="resume-optimize-actions">
                <button
                  type="button"
                  className="resume-wizard-secondary"
                  onClick={() => setOptimizeModalOpen(false)}
                  disabled={Boolean(aiLoading)}
                >
                  Cancel
                </button>
                <button type="submit" className="resume-wizard-primary" disabled={Boolean(aiLoading)}>
                  {aiLoading === 'parse_resume'
                    ? 'Reading resume…'
                    : aiLoading === 'build_resume'
                      ? 'Optimizing…'
                      : 'Generate optimized resume'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {wizardOpen ? (
        <div className="resume-wizard-backdrop" onClick={() => setWizardOpen(false)} role="presentation">
          <div className="resume-wizard-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="resume-wizard-header">
              <div>
                <p className="resume-wizard-step-count">
                  Step {stepIndex + 1} of {WIZARD_STEPS.length}
                </p>
                <h2>{currentStep.title}</h2>
                <p>{currentStep.hint}</p>
              </div>
              <button type="button" className="resume-wizard-close" onClick={() => setWizardOpen(false)}>
                ✕
              </button>
            </div>

            <div className="resume-wizard-progress">
              {WIZARD_STEPS.map((step, index) => (
                <span
                  key={step.key}
                  className={`resume-wizard-dot${index === stepIndex ? ' resume-wizard-dot--active' : ''}${index < stepIndex ? ' resume-wizard-dot--done' : ''}`}
                />
              ))}
            </div>

            <div className="resume-wizard-body">
              {currentStep.key === 'job' ? (
                <label>
                  Job description
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the full job posting or role description here…"
                    rows={8}
                  />
                </label>
              ) : null}

              {currentStep.key === 'profile' ? (
                <>
                  <label>
                    Full name
                    <input
                      value={resume?.name || ''}
                      onChange={(e) => setResume((c) => (c ? { ...c, name: e.target.value } : c))}
                      placeholder="Your full name"
                    />
                  </label>
                  <label>
                    Headline / target role
                    <input
                      value={resume?.role || ''}
                      onChange={(e) => setResume((c) => (c ? { ...c, role: e.target.value } : c))}
                      placeholder="AI will suggest this from the job description"
                    />
                  </label>
                  <button type="button" className="resume-ai-inline-btn" onClick={suggestHeadline} disabled={Boolean(aiLoading)}>
                    {aiLoading === 'job_headline' ? 'Suggesting…' : 'Suggest headline from job'}
                  </button>
                </>
              ) : null}

              {currentStep.key === 'contact' ? (
                <div className="resume-structured-grid">
                  <label>
                    Email
                    <input
                      type="email"
                      value={contact.email}
                      onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                      placeholder="you@email.com"
                    />
                  </label>
                  <label>
                    Mobile number
                    <input
                      value={contact.phone}
                      onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                      placeholder="+91 98765 43210"
                    />
                  </label>
                  <label>
                    LinkedIn
                    <input
                      value={contact.linkedin}
                      onChange={(e) => setContact((c) => ({ ...c, linkedin: e.target.value }))}
                      placeholder="linkedin.com/in/yourprofile"
                    />
                  </label>
                  <label>
                    Location (optional)
                    <input
                      value={contact.location}
                      onChange={(e) => setContact((c) => ({ ...c, location: e.target.value }))}
                      placeholder="Hyderabad, India"
                    />
                  </label>
                </div>
              ) : null}

              {currentStep.key === 'experience' ? (
                <div className="resume-entry-list">
                  <div className="resume-ai-paste-panel">
                    <label>
                      Paste experience in any format
                      <textarea
                        value={experiencePaste}
                        onChange={(e) => setExperiencePaste(e.target.value)}
                        placeholder={'Frontend Developer at Acme Corp, Jan 2023 – Present\nBuilt dashboards, improved load time'}
                        rows={5}
                      />
                    </label>
                    <button
                      type="button"
                      className="resume-ai-chip-btn"
                      onClick={parseExperienceWithAI}
                      disabled={Boolean(aiLoading)}
                    >
                      {aiLoading === 'parse_experience' ? 'Aligning…' : '✦ Add with AI'}
                    </button>
                  </div>
                  {experiences.map((item, index) => (
                    <div key={item.id} className="resume-entry-card">
                      <div className="resume-entry-head">
                        <strong>Experience {index + 1}</strong>
                        {experiences.length > 1 ? (
                          <button
                            type="button"
                            className="resume-entry-remove"
                            onClick={() => setExperiences((current) => current.filter((row) => row.id !== item.id))}
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                      <label>
                        Job title / role
                        <input value={item.role} onChange={(e) => updateExperience(item.id, 'role', e.target.value)} placeholder="Frontend Developer" />
                      </label>
                      <label>
                        Company name
                        <input value={item.company} onChange={(e) => updateExperience(item.id, 'company', e.target.value)} placeholder="Acme Corp" />
                      </label>
                      <label>
                        Time period
                        <input value={item.period} onChange={(e) => updateExperience(item.id, 'period', e.target.value)} placeholder="Jan 2023 – Present" />
                      </label>
                      <label>
                        Key points (one per line — AI will polish these)
                        <textarea
                          value={(item.bullets || []).join('\n')}
                          onChange={(e) => updateExperienceBullets(item.id, e.target.value)}
                          placeholder={'Built responsive dashboards\nImproved page load time by 30%'}
                          rows={4}
                        />
                      </label>
                    </div>
                  ))}
                  <button type="button" className="resume-entry-add" onClick={() => setExperiences((c) => [...c, emptyExperience()])}>
                    + Add another experience
                  </button>
                </div>
              ) : null}

              {currentStep.key === 'projects' ? (
                <div className="resume-entry-list">
                  <div className="resume-ai-paste-panel">
                    <label>
                      Paste projects in any format
                      <textarea
                        value={projectsPaste}
                        onChange={(e) => setProjectsPaste(e.target.value)}
                        placeholder={'E-commerce App — React, Node\nBuilt checkout flow\nIntegrated payments'}
                        rows={5}
                      />
                    </label>
                    <button
                      type="button"
                      className="resume-ai-chip-btn"
                      onClick={parseProjectsWithAI}
                      disabled={Boolean(aiLoading)}
                    >
                      {aiLoading === 'parse_projects' ? 'Aligning…' : '✦ Add with AI'}
                    </button>
                  </div>
                  {projects.map((item, index) => (
                    <div key={item.id} className="resume-entry-card">
                      <div className="resume-entry-head">
                        <strong>Project {index + 1}</strong>
                        {projects.length > 1 ? (
                          <button
                            type="button"
                            className="resume-entry-remove"
                            onClick={() => setProjects((current) => current.filter((row) => row.id !== item.id))}
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                      <label>
                        Project name
                        <input value={item.name} onChange={(e) => updateProject(item.id, 'name', e.target.value)} placeholder="E-commerce Web App" />
                      </label>
                      <div className="resume-skills-editor-head">
                        <span>Skills / technologies used</span>
                        <button
                          type="button"
                          className="resume-ai-chip-btn"
                          onClick={() => suggestProjectSkills(item.id)}
                          disabled={Boolean(aiLoading) || projectSkillsLoadingId === item.id}
                        >
                          {projectSkillsLoadingId === item.id ? 'Suggesting…' : '✦ Suggest skills'}
                        </button>
                      </div>
                      <input
                        aria-label="Skills / technologies used"
                        value={(item.skills || []).join(', ')}
                        onChange={(e) => updateProjectSkills(item.id, e.target.value)}
                        placeholder="React, Node.js, MongoDB"
                      />
                      <p className="resume-muted">Comma-separated. Use Suggest skills, parse with AI, or add manually.</p>
                      <label>
                        Bullet points (2–4 points, one per line)
                        <textarea
                          value={(item.bullets || []).join('\n')}
                          onChange={(e) => updateProjectBullets(item.id, e.target.value)}
                          placeholder={'Built checkout flow with React and Node\nIntegrated Razorpay payments\nReduced cart drop-off by 18%'}
                          rows={5}
                        />
                      </label>
                      <p className="resume-muted">Minimum 2 and maximum 4 bullet points per project.</p>
                    </div>
                  ))}
                  <button type="button" className="resume-entry-add" onClick={() => setProjects((c) => [...c, emptyProject()])}>
                    + Add another project
                  </button>
                </div>
              ) : null}

              {currentStep.key === 'skills' ? (
                <div className="resume-skills-editor">
                  <div className="resume-skills-editor-head">
                    <span className="resume-skills-label">Skills</span>
                    <button
                      type="button"
                      className="resume-ai-chip-btn"
                      onClick={suggestSkills}
                      disabled={Boolean(aiLoading) || skillsRetryCountdown > 0}
                    >
                      {aiLoading === 'job_skills'
                        ? 'Suggesting…'
                        : skillsRetryCountdown > 0
                          ? `Try again in ${skillsRetryCountdown}s`
                          : '✦ Suggest skills with AI'}
                    </button>
                  </div>
                  <div className="resume-skill-tags resume-skill-tags--editable">
                    {skillItems.length ? (
                      skillItems.map((skill) => (
                        <span
                          key={skill.name}
                          className={`resume-skill-tag${skill.matched ? '' : ' resume-skill-tag--mismatch'}`}
                          style={skill.matched ? undefined : { color: SKILL_MISMATCH_COLOR, borderColor: SKILL_MISMATCH_COLOR }}
                        >
                          {skill.name}
                          <button type="button" onClick={() => removeSkill(skill.name)} aria-label={`Remove ${skill.name}`}>
                            ×
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="resume-muted">No skills yet. Click AI suggest or add your own.</span>
                    )}
                  </div>
                  {hasUnmatchedSkills(skillItems) ? (
                    <p className="resume-skill-legend">
                      <span className="resume-skill-legend-swatch" aria-hidden="true" />
                      {SKILL_MISMATCH_LEGEND}
                    </p>
                  ) : null}
                  <div className="resume-skill-add-row">
                    <input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Type a skill and press Add"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addSkill()
                        }
                      }}
                    />
                    <button type="button" className="resume-skill-add-btn" onClick={addSkill}>
                      Add
                    </button>
                  </div>
                </div>
              ) : null}

              {currentStep.key === 'education' ? (
                <div className="resume-entry-list">
                  <div className="resume-ai-paste-panel">
                    <label>
                      Paste education in any format
                      <textarea
                        value={educationPaste}
                        onChange={(e) => setEducationPaste(e.target.value)}
                        placeholder={'B.Tech Computer Science, JNTU Hyderabad, 2020–2024, 8.5 CGPA\nIntermediate, XYZ College, 2018–2020, 92%'}
                        rows={5}
                      />
                    </label>
                    <button
                      type="button"
                      className="resume-ai-chip-btn"
                      onClick={parseEducationWithAI}
                      disabled={Boolean(aiLoading)}
                    >
                      {aiLoading === 'parse_education' ? 'Aligning…' : '✦ Add with AI'}
                    </button>
                  </div>
                  {educations.map((item, index) => (
                    <div key={item.id} className="resume-entry-card">
                      <div className="resume-entry-head">
                        <strong>Education {index + 1}</strong>
                        {educations.length > 1 ? (
                          <button
                            type="button"
                            className="resume-entry-remove"
                            onClick={() => setEducations((current) => current.filter((row) => row.id !== item.id))}
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                      <label>
                        Degree (full name)
                        <input value={item.degree} onChange={(e) => updateEducation(item.id, 'degree', e.target.value)} placeholder="Bachelor of Technology" />
                      </label>
                      <label>
                        Short form
                        <input value={item.shortName} onChange={(e) => updateEducation(item.id, 'shortName', e.target.value)} placeholder="B.Tech" />
                      </label>
                      <label>
                        University / institution
                        <input value={item.institution} onChange={(e) => updateEducation(item.id, 'institution', e.target.value)} placeholder="JNTU Hyderabad" />
                      </label>
                      <div className="resume-structured-grid">
                        <label>
                          Time period
                          <input value={item.period} onChange={(e) => updateEducation(item.id, 'period', e.target.value)} placeholder="2020 – 2024" />
                        </label>
                        <label>
                          CGPA / marks
                          <input value={item.grade} onChange={(e) => updateEducation(item.id, 'grade', e.target.value)} placeholder="8.5 CGPA" />
                        </label>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="resume-entry-add" onClick={() => setEducations((c) => [...c, emptyEducation()])}>
                    + Add another education
                  </button>
                </div>
              ) : null}

              {currentStep.key === 'generate' ? (
                <div className="resume-generate-panel">
                  <p>Generate an ATS-friendly resume with only the required sections:</p>
                  <ul>
                    <li><strong>Name</strong> — {resume?.name || 'Required'}</li>
                    <li><strong>Headline</strong> — {resume?.role || 'From job description'}</li>
                    <li><strong>Contact</strong> — {formatContactLine(contact) || 'Email required'}</li>
                    <li><strong>Experience</strong> — {filledExperienceCount ? `${filledExperienceCount} role(s)` : 'Skipped if empty'}</li>
                    <li><strong>Projects</strong> — {filledProjectCount ? `${filledProjectCount} project(s)` : 'Skipped if empty'}</li>
                    <li><strong>Education</strong> — {filledEducationCount ? `${filledEducationCount} entry(ies)` : 'Skipped if empty'}</li>
                  </ul>
                  <p className="resume-muted">Job description is used for tailoring only — it will not appear on the resume.</p>
                </div>
              ) : null}

              {currentStep.key === 'generate' && retryCountdown > 0 ? (
                <p className="resume-busy-message" role="status" aria-live="polite">
                  The server is currently busy. Please try again in{' '}
                  <strong>{retryCountdown}</strong> second{retryCountdown === 1 ? '' : 's'}.
                </p>
              ) : error ? (
                <p className="resume-error">{error}</p>
              ) : null}
            </div>

            <div className="resume-wizard-footer">
              <button type="button" className="resume-wizard-secondary" onClick={goBack} disabled={stepIndex === 0}>
                Back
              </button>
              <button
                type="button"
                className="resume-wizard-primary"
                onClick={goNext}
                disabled={Boolean(aiLoading) || (currentStep.key === 'generate' && retryCountdown > 0)}
              >
                {currentStep.key === 'generate'
                  ? aiLoading === 'build_resume'
                    ? 'Optimizing ATS resume…'
                    : retryCountdown > 0
                      ? `Try again in ${retryCountdown}s`
                      : 'Generate resume with AI'
                  : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {atsModalOpen && previewAts ? (
        <div className="resume-wizard-backdrop" onClick={() => setAtsModalOpen(false)} role="presentation">
          <div className="resume-ats-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="resume-ats-modal-head">
              <div>
                <p className="resume-preview-label">ATS-friendly resume</p>
                <h2>Your tailored resume is ready</h2>
                <p className="resume-muted">Every section optimized for ATS — matched to your job description.</p>
              </div>
              <button type="button" className="resume-wizard-close" onClick={() => setAtsModalOpen(false)}>
                ✕
              </button>
            </div>
            <AtsResumeDocumentModal ats={previewAts} sections={atsSections} />
            <div className="resume-ats-modal-footer">
              <button type="button" className="resume-wizard-secondary" onClick={() => setAtsModalOpen(false)}>
                Close
              </button>
              <button type="button" className="resume-download-btn" onClick={handleDownloadAts} disabled={downloadingPdf}>
                {downloadingPdf ? 'Generating PDF…' : 'Download PDF'}
              </button>
              <button type="button" className="resume-wizard-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save resume'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default ResumeMakerPage
