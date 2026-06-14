const GENDER_VALUES = ['', 'male', 'female', 'non_binary', 'other', 'prefer_not_to_say'];

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeSkills = (skills = []) => {
  if (typeof skills === 'string') {
    return skills
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(skills)) return [];
  return [...new Set(skills.map((item) => String(item).trim()).filter(Boolean))];
};

const normalizeBullets = (bullets = []) => {
  if (typeof bullets === 'string') {
    return bullets
      .split('\n')
      .map((item) => item.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 6);
  }
  if (!Array.isArray(bullets)) return [];
  return bullets.map((item) => String(item).trim()).filter(Boolean).slice(0, 6);
};

const normalizeProjects = (items = []) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      id: item.id || createId(),
      name: String(item.name || item.title || '').trim(),
      skills: normalizeSkills(item.skills),
      bullets: normalizeBullets(item.bullets?.length ? item.bullets : item.description || []),
      description: String(item.description || '').trim(),
    }))
    .filter((item) => item.name || item.skills.length || item.bullets.length || item.description);
};

const normalizeCertifications = (items = []) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      id: item.id || createId(),
      name: String(item.name || '').trim(),
      issuer: String(item.issuer || item.organization || '').trim(),
      year: String(item.year || item.date || '').trim(),
      url: String(item.url || item.credentialUrl || '').trim(),
    }))
    .filter((item) => item.name || item.issuer || item.year || item.url);
};

const normalizeResumeProfile = (profile = {}) => {
  const gender = GENDER_VALUES.includes(profile.gender) ? profile.gender : '';
  const projects = normalizeProjects(profile.projects);
  const certifications = normalizeCertifications(profile.certifications);

  return {
    dateOfBirth: String(profile.dateOfBirth || '').trim(),
    gender,
    phone: String(profile.phone || profile.mobile || '').trim(),
    githubUrl: String(profile.githubUrl || profile.github || '').trim(),
    portfolioUrl: String(profile.portfolioUrl || profile.portfolio || '').trim(),
    linkedinUrl: String(profile.linkedinUrl || profile.linkedin || '').trim(),
    skills: normalizeSkills(profile.skills),
    projects,
    certifications,
  };
};

const emptyResumeProfile = () => ({
  dateOfBirth: '',
  gender: '',
  phone: '',
  githubUrl: '',
  portfolioUrl: '',
  linkedinUrl: '',
  skills: [],
  projects: [],
  certifications: [],
});

module.exports = {
  GENDER_VALUES,
  normalizeResumeProfile,
  emptyResumeProfile,
};
