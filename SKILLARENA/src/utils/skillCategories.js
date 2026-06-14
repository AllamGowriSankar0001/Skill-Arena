import { skillItemsToText } from './resumeSkills'

const FORBIDDEN_CATEGORY = /^(other|miscellaneous|misc|general|uncategorized)$/i

const normalizeSkillName = (value = '') => value.toLowerCase().trim().replace(/\s+/g, ' ')

export const parseSkillCategoriesResponse = (output = '') => {
  if (!output.trim()) return null

  try {
    const cleaned = output.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    const categories = Array.isArray(parsed?.categories) ? parsed.categories : []
    return {
      categories: categories
        .map((group) => ({
          name: String(group?.name || '').trim(),
          skills: Array.isArray(group?.skills) ? group.skills.map((skill) => String(skill).trim()).filter(Boolean) : [],
        }))
        .filter((group) => group.name && group.skills.length),
    }
  } catch {
    return null
  }
}

const isForbiddenCategory = (name) => FORBIDDEN_CATEGORY.test(String(name || '').trim())

const mergeGroups = (groups) => {
  const merged = new Map()

  groups.forEach((group) => {
    const key = group.category.trim()
    if (!key) return
    if (!merged.has(key)) merged.set(key, [])
    merged.get(key).push(...group.skills)
  })

  return [...merged.entries()].map(([category, skills]) => ({
    category,
    skills: dedupeSkillItems(skills),
  }))
}

const dedupeSkillItems = (skills) => {
  const seen = new Set()
  const result = []
  skills.forEach((skill) => {
    const key = normalizeSkillName(skill.name)
    if (!key || seen.has(key)) return
    seen.add(key)
    result.push(skill)
  })
  return result
}

export const buildSkillGroupsFromAI = (parsed, skillItems = []) => {
  const itemLookup = new Map(
    skillItems.map((item) => [normalizeSkillName(item.name), { name: item.name, matched: item.matched !== false }]),
  )

  const assigned = new Set()
  const groups = []

  ;(parsed?.categories || []).forEach((group) => {
    const category = String(group.name || '').trim()
    if (!category || isForbiddenCategory(category)) return

    const skills = []
    ;(group.skills || []).forEach((skillName) => {
      const key = normalizeSkillName(skillName)
      const item = itemLookup.get(key)
      if (!item || assigned.has(key)) return
      assigned.add(key)
      skills.push(item)
    })

    if (skills.length) {
      groups.push({ category, skills })
    }
  })

  const missing = skillItems.filter((item) => !assigned.has(normalizeSkillName(item.name)))
  if (missing.length) {
    groupSkillsByCategory(missing).forEach((fallbackGroup) => {
      groups.push(fallbackGroup)
    })
  }

  return mergeGroups(groups)
}

export const requestSkillCategoryGroups = async (generateAI, skillItems = [], extra = {}) => {
  if (!skillItems.length) return []

  const output = await generateAI('categorize_skills', {
    context: extra.context,
    state: {
      skillNames: skillItems.map((item) => item.name),
      skillsText: skillItemsToText(skillItems),
      jobDescription: extra.jobDescription,
      ...(extra.state || {}),
    },
  })

  if (!output) return groupSkillsByCategory(skillItems)

  const parsed = parseSkillCategoriesResponse(output)
  if (!parsed?.categories?.length) return groupSkillsByCategory(skillItems)

  return buildSkillGroupsFromAI(parsed, skillItems)
}

export const formatSkillGroupsPlainText = (groups = []) =>
  groups.map((group) => `${group.category}: ${group.skills.map((skill) => skill.name).join(', ')}`).join('\n')

// Fallback categorization when AI is unavailable. Never emits an "Other" category.
export const SKILL_CATEGORY_LABELS = {
  programming: 'Programming Languages',
  web: 'Web Technologies',
  frameworks: 'Frameworks & Libraries',
  databases: 'Databases & Data',
  cloud: 'Cloud & DevOps',
  tools: 'Tools & Platforms',
  soft: 'Soft Skills',
}

export const SKILL_CATEGORY_ORDER = [
  'programming',
  'web',
  'frameworks',
  'databases',
  'cloud',
  'tools',
  'soft',
]

const compactSkillKey = (value = '') => value.toLowerCase().replace(/[^a-z0-9+#]/g, '')

const SKILL_CATEGORY_ALIASES = {
  programming: ['python', 'c++', 'cpp', 'c#', 'csharp', 'java', 'typescript', 'go', 'golang', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala'],
  web: ['html', 'html5', 'css', 'css3', 'sass', 'scss', 'less', 'javascript', 'js', 'jsx', 'graphql', 'rest', 'tailwind', 'bootstrap'],
  frameworks: ['react', 'reactjs', 'angular', 'vue', 'nextjs', 'django', 'flask', 'fastapi', 'spring', 'express', 'nodejs', 'node.js', 'dotnet', '.net'],
  databases: ['sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'mongo', 'redis', 'sqlite', 'dynamodb', 'firebase'],
  cloud: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'devops', 'ci/cd', 'linux'],
  tools: ['git', 'github', 'jira', 'postman', 'figma', 'agile', 'scrum', 'jest', 'pytest'],
  soft: ['communication', 'leadership', 'teamwork', 'collaboration', 'problem solving', 'project management'],
}

const aliasLookup = new Map()
Object.entries(SKILL_CATEGORY_ALIASES).forEach(([category, aliases]) => {
  aliases.forEach((alias) => aliasLookup.set(compactSkillKey(alias), category))
})

const resolveFallbackCategory = (name) => {
  const compact = compactSkillKey(name)
  if (!compact) return 'tools'

  if (aliasLookup.has(compact)) return aliasLookup.get(compact)

  for (const [alias, category] of aliasLookup.entries()) {
    if (alias.length >= 3 && (compact.includes(alias) || alias.includes(compact))) return category
  }

  const lower = name.toLowerCase()
  if (/\b(sql|database|mongo|postgres|mysql|redis|nosql)\b/.test(lower)) return 'databases'
  if (/\b(aws|azure|gcp|docker|kubernetes|devops|terraform|cloud)\b/.test(lower)) return 'cloud'
  if (/\b(react|angular|vue|django|flask|spring|express|next)\b/.test(lower)) return 'frameworks'
  if (/\b(html|css|javascript|frontend|front-end|web)\b/.test(lower)) return 'web'
  if (/\b(python|java|c\+\+|typescript|golang|rust|kotlin)\b/.test(lower)) return 'programming'
  if (/\b(git|jira|figma|postman|agile|scrum)\b/.test(lower)) return 'tools'
  if (/\b(leadership|communication|teamwork|collaboration|management)\b/.test(lower)) return 'soft'

  return 'tools'
}

export const groupSkillsByCategory = (skillItems = []) => {
  const buckets = new Map()

  skillItems.forEach((skill) => {
    const name = String(skill?.name || '').trim()
    if (!name) return
    const category = resolveFallbackCategory(name)
    if (!buckets.has(category)) buckets.set(category, [])
    buckets.get(category).push({ name, matched: skill.matched !== false })
  })

  return SKILL_CATEGORY_ORDER.filter((category) => buckets.has(category)).map((category) => ({
    category: SKILL_CATEGORY_LABELS[category],
    skills: buckets.get(category),
  }))
}
