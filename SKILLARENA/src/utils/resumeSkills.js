export const SKILL_MISMATCH_COLOR = '#b42318'
export const SKILL_MISMATCH_LEGEND =
  'Skills shown in red are mentioned in the job description but were not found in your experience or projects.'

export const parseSkills = (text = '') =>
  text
    .split(/[,\n]|(?:\s+•\s+)|(?:^•\s+)/m)
    .map((item) => item.replace(/^[-•\s]+/, '').trim())
    .filter(Boolean)

const INVALID_SKILL_PATTERN =
  /^[`{\}\[\]"':,\\.#-]+$|^```|^json$|^"skills"$|^"fromJobDescription"$/i

export const isValidSkillName = (name) => {
  const trimmed = String(name || '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .trim()
  if (!trimmed || trimmed.length < 2) return false
  if (INVALID_SKILL_PATTERN.test(trimmed)) return false
  if (/^"skills"\s*:/i.test(trimmed) || /^"fromJobDescription"\s*:/i.test(trimmed)) return false
  return true
}

export const normalizeSkillName = (name) =>
  String(name || '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(/\\"/g, '"')
    .trim()

const sanitizeSkillNames = (names) =>
  uniqueSkills(
    names
      .map((name) => normalizeSkillName(name))
      .filter(isValidSkillName),
  )

const extractJsonObject = (text = '') => {
  const cleaned = String(text)
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim()

  const start = cleaned.indexOf('{')
  if (start === -1) return null

  let depth = 0
  for (let index = start; index < cleaned.length; index += 1) {
    const char = cleaned[index]
    if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, index + 1))
        } catch {
          return null
        }
      }
    }
  }

  return null
}

const SKILL_ARRAY_KEYS = [
  'skills',
  'fromJobDescription',
  'fromExperience',
  'fromProjects',
]

const extractQuotedSkillsFromText = (text = '') => {
  const skills = []
  const patterns = SKILL_ARRAY_KEYS.map(
    (key) => new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)(?:\\]|$)`, 'i'),
  )

  patterns.forEach((pattern) => {
    const match = String(text).match(pattern)
    if (!match) return
    const segment = match[1]
    const stringMatches = segment.matchAll(/"((?:\\.|[^"\\])*)"/g)
    for (const item of stringMatches) {
      const value = normalizeSkillName(item[1])
      if (isValidSkillName(value)) skills.push(value)
    }
  })

  return sanitizeSkillNames(skills)
}

const readSkillArray = (payload, key) =>
  Array.isArray(payload?.[key]) ? payload[key].map(String) : []

const parseSkillNamesFromPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return { skills: [], fromJobDescription: [] }
  }

  const fromJobDescription = readSkillArray(payload, 'fromJobDescription')
  const fromExperience = readSkillArray(payload, 'fromExperience')
  const fromProjects = readSkillArray(payload, 'fromProjects')
  const skills = readSkillArray(payload, 'skills')

  return {
    skills: sanitizeSkillNames([
      ...fromJobDescription,
      ...fromExperience,
      ...fromProjects,
      ...skills,
    ]),
    fromJobDescription: sanitizeSkillNames(fromJobDescription),
  }
}

const looksLikeJsonSkillsOutput = (text = '') =>
  /[{[]|"(?:skills|fromJobDescription|fromExperience|fromProjects)"\s*:/i.test(String(text))

export const uniqueSkills = (skills) => [...new Set(skills.map((s) => s.trim()).filter(Boolean))]

export const joinSkills = (skills) => uniqueSkills(skills).join(', ')

export const mergeSkills = (currentText, incomingText) =>
  joinSkills([...parseSkills(currentText), ...parseSkills(incomingText)])

const normalizeSkillToken = (value) => value.toLowerCase().replace(/[^a-z0-9+#.]/g, '')

const SKILL_LABEL_OVERRIDES = {
  javascript: 'JavaScript',
  js: 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  nodejs: 'Node.js',
  'node.js': 'Node.js',
  node: 'Node.js',
  html5: 'HTML5',
  css3: 'CSS3',
  cpp: 'C++',
  'c++': 'C++',
  csharp: 'C#',
  'c#': 'C#',
  dotnet: '.NET',
  '.net': '.NET',
  nextjs: 'Next.js',
  'next.js': 'Next.js',
  reactjs: 'React',
  react: 'React',
  vuejs: 'Vue',
  vue: 'Vue',
  angular: 'Angular',
  postgresql: 'PostgreSQL',
  postgres: 'PostgreSQL',
  mongodb: 'MongoDB',
  mongo: 'MongoDB',
  graphql: 'GraphQL',
  'ci/cd': 'CI/CD',
  cicd: 'CI/CD',
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure',
  django: 'Django',
  flask: 'Flask',
  fastapi: 'FastAPI',
  expressjs: 'Express',
  express: 'Express',
  kubernetes: 'Kubernetes',
  k8s: 'Kubernetes',
  tensorflow: 'TensorFlow',
  pytorch: 'PyTorch',
  'scikit-learn': 'Scikit-learn',
  sklearn: 'Scikit-learn',
}

const SKILL_SCAN_ALIASES = [
  'python', 'c++', 'cpp', 'c#', 'csharp', 'java', 'typescript', 'ts', 'go', 'golang', 'rust', 'ruby', 'php',
  'swift', 'kotlin', 'scala', 'html', 'html5', 'css', 'css3', 'sass', 'scss', 'less', 'javascript', 'js', 'jsx',
  'graphql', 'rest', 'restful', 'rest api', 'rest apis', 'tailwind', 'tailwindcss', 'bootstrap', 'material ui',
  'react', 'reactjs', 'react native', 'reactnative', 'angular', 'vue', 'vuejs', 'nextjs', 'next.js', 'nuxt',
  'svelte', 'django', 'flask', 'fastapi', 'spring', 'spring boot', 'springboot', 'express', 'expressjs', 'nodejs',
  'node.js', 'node', 'nestjs', 'laravel', 'rails', 'dotnet', '.net', 'asp.net', 'redux', 'jquery', 'vite', 'webpack',
  'sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'mongodb', 'mongo', 'redis', 'dynamodb', 'firebase', 'firestore',
  'oracle', 'mariadb', 'elasticsearch', 'supabase', 'prisma', 'nosql', 'aws', 'azure', 'gcp', 'google cloud',
  'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins', 'github actions', 'gitlab ci', 'circleci',
  'devops', 'serverless', 'lambda', 'nginx', 'apache', 'microservices', 'linux', 'git', 'github', 'gitlab', 'jira',
  'postman', 'swagger', 'openapi', 'figma', 'jest', 'pytest', 'selenium', 'cypress', 'mocha', 'agile', 'scrum',
  'tensorflow', 'pytorch', 'keras', 'pandas', 'numpy', 'machine learning', 'data analysis',
  'full-stack', 'full stack', 'fullstack', 'e-commerce', 'ecommerce', 'api development', 'web development',
  'mobile development', 'cloud computing', 'unit testing', 'integration testing',
]

const toSkillLabel = (alias) => {
  const key = alias.toLowerCase().trim()
  if (SKILL_LABEL_OVERRIDES[key]) return SKILL_LABEL_OVERRIDES[key]
  if (key.includes(' ')) {
    return key
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }
  if (/^[a-z0-9+#.]+$/.test(key) && key.length <= 4) return key.toUpperCase()
  return key.charAt(0).toUpperCase() + key.slice(1)
}

const SORTED_SKILL_SCAN_TERMS = [...SKILL_SCAN_ALIASES]
  .sort((a, b) => b.length - a.length)
  .map((alias) => ({ alias: alias.toLowerCase(), label: toSkillLabel(alias) }))

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const isSkillRelatedToJobDescription = (skill, jobDescription = '') => {
  const jd = String(jobDescription || '').trim()
  if (!jd) return true

  const skillNorm = normalizeSkillToken(skill)
  const jdNorm = normalizeSkillToken(jd)
  if (!skillNorm) return false

  if (jdNorm.includes(skillNorm)) return true

  const compactSkill = skillNorm.replace(/\./g, '')
  const compactJd = jdNorm.replace(/\./g, '')
  if (compactSkill.length >= 2 && compactJd.includes(compactSkill)) return true

  const jdLower = jd.toLowerCase()
  const skillWords = skill
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((word) => word.length >= 3)

  if (skillWords.some((word) => jdLower.includes(word))) return true

  const jdWords = jdLower.split(/[^a-z0-9+#.]+/).filter((word) => word.length >= 4)
  if (jdWords.some((word) => skill.toLowerCase().includes(word))) return true

  return false
}

const NON_SKILL_PHRASE_PATTERN =
  /\b(support coming|housekeeping|cleaner|customer service|help desk|status update|user role|job duty|business feature|workflow status|operations team|front desk|room service|maid|laundry)\b/i

const APPROVED_CAPABILITY_PATTERN =
  /^(full[- ]?stack development|e-?commerce development|api development|web development|mobile development|cloud computing|machine learning|data analysis|rest apis?|ci\/cd|unit testing|integration testing|software development|backend development|frontend development|cross[- ]platform development)$/i

const isCatalogSkill = (name) => {
  const norm = normalizeSkillToken(name)
  if (!norm) return false

  return SORTED_SKILL_SCAN_TERMS.some(({ alias, label }) => {
    const aliasNorm = normalizeSkillToken(alias)
    const labelNorm = normalizeSkillToken(label)
    return norm === aliasNorm || norm === labelNorm
  })
}

export const filterResumeSkills = (names = []) =>
  sanitizeSkillNames(names).filter((name) => {
    if (!isValidSkillName(name)) return false
    if (NON_SKILL_PHRASE_PATTERN.test(name)) return false
    if (name.split(/\s+/).length > 5) return false
    if (isCatalogSkill(name)) return true
    if (APPROVED_CAPABILITY_PATTERN.test(name.trim())) return true
    if (/\.(js|ts|tsx|jsx|py|net)$/i.test(name)) return true
    return false
  })

const rejectObviousNonSkills = (names = []) =>
  sanitizeSkillNames(names).filter((name) => {
    if (!isValidSkillName(name)) return false
    if (NON_SKILL_PHRASE_PATTERN.test(name)) return false
    if (name.split(/\s+/).length > 5) return false
    return true
  })

export const extractMentionedSkillsFromText = (text = '') => {
  const source = String(text || '')
  if (!source.trim()) return []

  const lower = source.toLowerCase()
  const found = []
  const usedSpans = []

  const markUsed = (start, end) => {
    usedSpans.push([start, end])
  }

  const overlapsUsed = (start, end) =>
    usedSpans.some(([usedStart, usedEnd]) => start < usedEnd && end > usedStart)

  SORTED_SKILL_SCAN_TERMS.forEach(({ alias, label }) => {
    const pattern = new RegExp(`(^|[^a-z0-9+#.])${escapeRegExp(alias)}([^a-z0-9+#.]|$)`, 'gi')
    let match = pattern.exec(lower)
    while (match) {
      const start = match.index + (match[1] ? match[1].length : 0)
      const end = start + alias.length
      if (!overlapsUsed(start, end)) {
        found.push(label)
        markUsed(start, end)
      }
      match = pattern.exec(lower)
    }
  })

  return filterResumeSkills(found)
}

export const extractSkillsFromProject = (project = {}) => {
  const chunks = [project.name, ...(project.bullets || []), ...(project.skills || [])]
  return extractMentionedSkillsFromText(chunks.filter(Boolean).join('\n'))
}

export const extractSkillsFromProjects = (projects = []) =>
  filterResumeSkills(projects.flatMap((item) => extractSkillsFromProject(item)))

export const mergeProjectSkillNames = (aiSkills = [], project = {}, jobDescription = '') => {
  const fromAi = sanitizeSkillNames(aiSkills)
  const fromProject = extractSkillsFromProject(project)
  const fromJob = extractMentionedSkillsFromText(jobDescription)
  const hasJob = Boolean(String(jobDescription || '').trim())

  const projectRelevantJobSkills = hasJob
    ? fromJob.filter((skill) =>
        fromProject.some((projectSkill) => {
          const projectToken = normalizeSkillToken(projectSkill)
          const skillToken = normalizeSkillToken(skill)
          return projectToken.includes(skillToken) || skillToken.includes(projectToken)
        }),
      )
    : []

  return filterResumeSkills([...fromAi, ...fromProject, ...projectRelevantJobSkills])
}

export const extractSkillsFromExperience = (experiences = []) => {
  const chunks = []
  experiences.forEach((item) => {
    chunks.push(item.role, item.company, ...(item.bullets || []))
  })
  return extractMentionedSkillsFromText(chunks.filter(Boolean).join('\n'))
}

export const mergeSuggestedSkillNames = (
  aiSkills = [],
  jobDescription = '',
  experiences = [],
  projects = [],
) => {
  const fromAi = sanitizeSkillNames(aiSkills)
  const fromJobDescription = extractMentionedSkillsFromText(jobDescription)
  const fromExperience = extractSkillsFromExperience(experiences)
  const fromProjects = extractSkillsFromProjects(projects)
  const hasJobDescription = Boolean(String(jobDescription || '').trim())

  const backgroundSkills = sanitizeSkillNames([...fromExperience, ...fromProjects])
  const relevantBackground = hasJobDescription
    ? backgroundSkills.filter(
        (skill) =>
          isSkillRelatedToJobDescription(skill, jobDescription) ||
          fromJobDescription.some(
            (jdSkill) =>
              normalizeSkillToken(jdSkill).includes(normalizeSkillToken(skill)) ||
              normalizeSkillToken(skill).includes(normalizeSkillToken(jdSkill)),
          ),
      )
    : backgroundSkills

  return filterResumeSkills([
    ...fromAi,
    ...fromJobDescription,
    ...relevantBackground,
  ])
}

export const buildBackgroundText = (experiences = [], projects = []) => {
  const chunks = []
  experiences.forEach((item) => {
    chunks.push(item.role, item.company, item.period, ...(item.bullets || []))
  })
  projects.forEach((item) => {
    chunks.push(item.name, ...(item.bullets || []))
  })
  return chunks.filter(Boolean).join(' ')
}

export const isSkillMatchedInBackground = (skill, experiences = [], projects = []) => {
  const needle = normalizeSkillToken(skill)
  if (!needle) return true

  const haystack = normalizeSkillToken(buildBackgroundText(experiences, projects))
  if (!haystack) return false

  if (haystack.includes(needle)) return true

  const compactNeedle = needle.replace(/\./g, '')
  return compactNeedle.length > 1 && haystack.includes(compactNeedle)
}

export const parseSkillItemsFromSections = (sections = []) => {
  const section = sections.find((item) => item.type === 'skills')
  const items = section?.data?.items || []
  return items
    .map((item) => {
      if (typeof item === 'string') {
        return { name: item.trim(), matched: true }
      }
      return {
        name: String(item.name || '').trim(),
        matched: item.matched !== false,
      }
    })
    .filter((item) => item.name)
}

export const buildSkillItems = (names, experiences = [], projects = []) =>
  uniqueSkills(names).map((name) => ({
    name,
    matched: isSkillMatchedInBackground(name, experiences, projects),
  }))

export const mergeSkillItems = (current, incomingNames, experiences = [], projects = []) => {
  const names = uniqueSkills([...current.map((item) => item.name), ...incomingNames])
  return buildSkillItems(names, experiences, projects)
}

export const parseJobSkillsResponse = (output = '') => {
  if (!output.trim()) {
    return { skills: [], fromJobDescription: [] }
  }

  let result = { skills: [], fromJobDescription: [] }

  const parsed = extractJsonObject(output)
  if (parsed) {
    result = parseSkillNamesFromPayload(parsed)
  } else {
    const recovered = extractQuotedSkillsFromText(output)
    if (recovered.length) {
      result = { skills: recovered, fromJobDescription: [] }
    } else if (!looksLikeJsonSkillsOutput(output)) {
      result = { skills: sanitizeSkillNames(parseSkills(output)), fromJobDescription: [] }
    }
  }

  return {
    skills: filterResumeSkills(result.skills),
    fromJobDescription: filterResumeSkills(result.fromJobDescription),
  }
}

export const parseValidateSkillsResponse = (output = '') => {
  if (!output.trim()) return []

  const parsed = extractJsonObject(output)
  if (parsed && Array.isArray(parsed.skills)) {
    return filterResumeSkills(parsed.skills.map(String))
  }

  const recovered = extractQuotedSkillsFromText(output)
  return filterResumeSkills(recovered)
}

export const finalizeSuggestedSkillNames = (candidates = []) => {
  const uniqueCandidates = sanitizeSkillNames(candidates)
  if (!uniqueCandidates.length) return []

  const validated = filterResumeSkills(uniqueCandidates)
  return validated.length ? validated : rejectObviousNonSkills(uniqueCandidates)
}

export const requestValidatedSkillNames = async (generateAI, candidates = [], extra = {}) => {
  const uniqueCandidates = sanitizeSkillNames(candidates)
  if (!uniqueCandidates.length) return []

  if (extra.useAi === false) {
    return finalizeSuggestedSkillNames(uniqueCandidates)
  }

  const output = await generateAI('validate_skills', {
    context: extra.context,
    state: {
      skillCandidates: uniqueCandidates,
      skillsText: uniqueCandidates.join(', '),
      jobDescription: extra.jobDescription,
      ...(extra.state || {}),
    },
  })

  const validated = parseValidateSkillsResponse(output || '')
  return validated.length ? validated : finalizeSuggestedSkillNames(uniqueCandidates)
}

export const skillItemsToText = (items) => joinSkills(items.map((item) => item.name))

export const hasUnmatchedSkills = (items) => items.some((item) => !item.matched)
