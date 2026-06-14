const VAGUE_PHRASE_PATTERNS = [
  /\bwith proper error handling and validation\b/gi,
  /\bwith proper error handling\b/gi,
  /\bproper error handling and validation\b/gi,
  /\bproper error handling\b/gi,
  /\bwith proper validation\b/gi,
  /\band proper validation\b/gi,
  /\bwith validation\b/gi,
  /\busing best practices\b/gi,
  /\bleveraged various\b/gi,
  /\bworked on various\b/gi,
  /\bresponsible for\b/gi,
  /\bhelped with\b/gi,
  /\bassisted with\b/gi,
  /\betc\.?\b/gi,
];

const WEAK_ENDINGS = [
  /\s+with\s*\.?$/i,
  /\s+and\s*\.?$/i,
  /\s+using\s*\.?$/i,
];

const cleanWhitespace = (text = '') => text.replace(/\s+/g, ' ').trim();

const ensureSentenceEnd = (text) => {
  if (!text) return text;
  if (/[.!?]$/.test(text)) return text;
  return `${text}.`;
};

const polishBullet = (bullet = '') => {
  let text = cleanWhitespace(String(bullet));
  if (!text) return '';

  VAGUE_PHRASE_PATTERNS.forEach((pattern) => {
    text = text.replace(pattern, '');
  });

  WEAK_ENDINGS.forEach((pattern) => {
    text = text.replace(pattern, '');
  });

  text = cleanWhitespace(text);
  text = text.replace(/\s+,/g, ',');
  text = text.replace(/,\s*,/g, ', ');
  text = text.replace(/\s+\./g, '.');

  if (!text) return '';

  if (/^[a-z]/.test(text)) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  return ensureSentenceEnd(text);
};

const polishBullets = (bullets = []) =>
  bullets.map(polishBullet).filter(Boolean);

const polishExperienceEntries = (entries = []) =>
  (Array.isArray(entries) ? entries : []).map((entry) => ({
    ...entry,
    bullets: polishBullets(entry.bullets),
  }));

const polishProjectEntries = (entries = []) =>
  (Array.isArray(entries) ? entries : []).map((entry) => ({
    ...entry,
    bullets: polishBullets(entry.bullets),
  }));

const parseJsonOutput = (output = '') => {
  try {
    const cleaned = String(output).replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
};

const polishResumeJson = (payload) => {
  if (!payload || typeof payload !== 'object') return payload;

  const next = { ...payload };

  if (Array.isArray(next.experience)) {
    next.experience = polishExperienceEntries(next.experience);
  }
  if (Array.isArray(next.projects)) {
    next.projects = polishProjectEntries(next.projects);
  }

  if (typeof next.summary === 'string') {
    next.summary = cleanWhitespace(next.summary.replace(/\betc\.?\b/gi, ''));
  }

  return next;
};

const polishStructuredOutput = (type, output = '') => {
  const jsonTypes = ['build_resume', 'parse_resume', 'parse_experience', 'parse_projects', 'parse_education', 'job_skills', 'project_skills', 'categorize_skills', 'validate_skills'];
  if (!jsonTypes.includes(type)) return output;

  const parsed = parseJsonOutput(output);
  if (!parsed) return output;

  const polished = polishResumeJson(parsed);
  return JSON.stringify(polished);
};

module.exports = {
  polishBullet,
  polishBullets,
  polishResumeJson,
  polishStructuredOutput,
  VAGUE_PHRASE_PATTERNS,
};
