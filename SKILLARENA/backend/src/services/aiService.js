const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const GEMINI_FALLBACK_MODELS = [
  GEMINI_MODEL,
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-flash-latest',
].filter((model, index, list) => model && list.indexOf(model) === index);

const { polishStructuredOutput } = require('../utils/resumeBulletQuality');
const { resolveUserAiKeyChain, userHasOwnAiKeys } = require('../utils/userAiKeys');

const RESUME_BULLET_RULES = `Bullet writing rules (MANDATORY — violations are not allowed):
- Start every bullet with a strong past-tense action verb (Built, Implemented, Reduced, Automated, Deployed).
- Prefer measurable results when the candidate provided numbers, scale, or outcomes (%, counts, latency, users, uptime). Never invent metrics.
- When no metrics exist, state concrete deliverables (e.g., "REST APIs for auth and contact workflows", "SMTP email flow for contact forms") — not generic quality claims.
- NEVER use vague filler phrases such as: "with proper error handling and validation", "with proper error handling", "using best practices", "worked on", "helped with", "responsible for", "etc."
- Instead of vague validation/error-handling claims, name what was validated or handled only if the candidate mentioned it (request schemas, auth tokens, SMTP failures, HTTP status codes).
- Fix spelling and grammar. Use clear, professional English.
- Do not repeat the same bullet wording across entries.
- Keep each bullet one concise sentence.`;

const buildAIPrompt = (type, context, state = {}) => {
  const sections = Array.isArray(state.sections) ? state.sections : [];
  const profile = {
    name: state.name,
    role: state.role,
    about: state.about,
    jobDescription: state.jobDescription,
    projectsText: state.projectsText,
    educationText: state.educationText,
    skills: sections.find((section) => section.type === 'skills')?.data?.items || [],
    experience: sections.find((section) => section.type === 'experience')?.data?.items || [],
    projects: sections.find((section) => section.type === 'projects')?.data?.items || [],
  };

  switch (type) {
    case 'job_headline':
      return `You are a resume coach. Given this job description, suggest ONE professional resume headline (max 14 words) tailored to the role. Return only the headline text without quotes.\n\nJob description:\n${context || state.jobDescription}`;
    case 'build_resume':
      return `Create an ATS-friendly resume tailored to the job description below. Use ONLY facts from the candidate data. Do not invent employers, companies, degrees, projects, or metrics.

Rules:
- Match keywords from the job description in summary, skills, and bullets.
- Skills must prioritize job-description keywords plus every skill the candidate provided. Never drop candidate skills.
- Keep each experience entry's company and period exactly as provided.
- For each project, return 2 to 4 bullet points only.
- For each project, include a skills array of technologies, frameworks, and tools used (from candidate data only).
- For each experience entry, return 2 to 5 action-verb bullets based on provided notes.
- Do not change education entries; they are shown separately.
- Plain text only in bullet strings.

${RESUME_BULLET_RULES}

Bad bullet (never output): "Built RESTful APIs using Node.js with proper error handling and validation."
Good bullet (when facts support it): "Built and integrated RESTful APIs in Node.js/Express for authentication, contact forms, and user notifications."

Return valid JSON only with this exact shape:
{
  "summary": "2-3 sentence professional summary",
  "skills": "comma-separated ATS keywords",
  "experience": [
    {
      "role": "job title",
      "company": "company name",
      "period": "time period",
      "bullets": ["bullet 1", "bullet 2"]
    }
  ],
  "projects": [
    {
      "name": "project name",
      "skills": ["React", "Node.js"],
      "bullets": ["bullet 1", "bullet 2", "bullet 3"]
    }
  ]
}

Job description:
${state.jobDescription || context}

Candidate:
Name: ${state.name || 'Candidate'}
Headline: ${state.role || ''}
Email: ${state.contact?.email || 'Not provided'}
Phone: ${state.contact?.phone || 'Not provided'}
LinkedIn: ${state.contact?.linkedin || 'Not provided'}
Location: ${state.contact?.location || 'Not provided'}

Projects provided by candidate:
${state.projectsSummary || state.projectsText || 'None'}

Experience provided by candidate:
${state.experienceSummary || state.experienceText || 'None'}

Skills provided by candidate:
${state.skillsText || 'None'}

Education provided by candidate:
${state.educationSummary || state.educationText || 'None'}`;
    case 'parse_experience':
      return `Parse the pasted work experience text into structured resume entries. Use only information present in the text. Do not invent companies, dates, roles, or metrics.

${RESUME_BULLET_RULES}

Return valid JSON only:
{
  "experience": [
    {
      "role": "job title",
      "company": "company name",
      "period": "time period",
      "bullets": ["achievement or responsibility", "another bullet"]
    }
  ]
}

Pasted experience text:
${context || state.experiencePaste || 'None'}`;
    case 'parse_projects':
      return `Parse the pasted projects text into structured resume project entries. Use only information in the text. Each project must have 2 to 4 bullet points. For each project, extract technologies, frameworks, languages, and tools mentioned into the skills array.

${RESUME_BULLET_RULES}

Return valid JSON only:
{
  "projects": [
    {
      "name": "project name",
      "skills": ["React", "Node.js"],
      "bullets": ["bullet 1", "bullet 2", "bullet 3"]
    }
  ]
}

Pasted projects text:
${context || state.projectsPaste || 'None'}`;
    case 'parse_education':
      return `Parse the pasted education text into structured education entries. Use only information in the text.

Return valid JSON only:
{
  "education": [
    {
      "degree": "full degree name",
      "shortName": "short form like B.Tech",
      "institution": "university or school",
      "period": "years attended",
      "grade": "CGPA or marks"
    }
  ]
}

Pasted education text:
${context || state.educationPaste || 'None'}`;
    case 'parse_resume':
      return `Parse the pasted resume text into structured candidate data. Use only information present in the text. Do not invent employers, degrees, projects, skills, or contact details.

${RESUME_BULLET_RULES}

Return valid JSON only with this exact shape:
{
  "name": "full name",
  "role": "headline or target role",
  "about": "professional summary if present",
  "contact": {
    "email": "",
    "phone": "",
    "linkedin": "",
    "location": ""
  },
  "skills": "comma-separated skills",
  "experience": [
    {
      "role": "job title",
      "company": "company name",
      "period": "time period",
      "bullets": ["bullet 1", "bullet 2"]
    }
  ],
  "projects": [
    {
      "name": "project name",
      "skills": ["React", "Node.js"],
      "bullets": ["bullet 1", "bullet 2"]
    }
  ],
  "education": [
    {
      "degree": "full degree name",
      "shortName": "short form",
      "institution": "school or university",
      "period": "years attended",
      "grade": "CGPA or marks"
    }
  ]
}

Resume text:
${context || state.resumeText || 'None'}`;
    case 'about':
      return `Write a concise and professional About Me section for a resume/portfolio using this profile data: ${JSON.stringify(profile)}. Return only the paragraph text.`;
    case 'resume':
      return `Write a resume summary paragraph suitable for a professional resume using this profile data: ${JSON.stringify(profile)}. Return only the paragraph text.`;
    case 'headline':
      return `Create a professional LinkedIn headline for this profile: ${JSON.stringify(profile)}. Return only the headline text.`;
    case 'project':
      return `Create polished project descriptions for the following projects: ${JSON.stringify(profile.projects)}. Return plain text.`;
    case 'job_skills':
      return `Extract ONLY real resume skills from the job description, candidate experience, and candidate projects.

What counts as a skill:
- Programming languages, frameworks, libraries, databases, cloud platforms, DevOps tools
- Technical tools (Git, Docker, Jira, Figma, Postman)
- Technical methodologies (Agile, Scrum, CI/CD, REST APIs)
- Specific technical capability phrases tied to engineering work (e.g. Full-Stack Development, API Development, E-commerce Development)

What is NOT a skill — NEVER include these:
- Job duties, features, workflows, or business processes (e.g. support tickets, housekeeping, cleaner roles, status updates)
- User roles, operational tasks, or domain nouns from project descriptions
- Random phrases, sentence fragments, or keywords copied from prose
- Company names, product feature names, or module/page names unless they are widely known technologies

Instructions:
1. Job description — include technical skills and ATS keywords that are actual skills/tools/technologies.
2. Experience — include only tools, stacks, and technologies used or demonstrated in bullets.
3. Projects — include only tools, stacks, and technologies used or demonstrated in bullets.
4. If a technology appears in experience or projects and is relevant to the job description, include it.
5. When unsure whether something is a skill, omit it.

Rules:
- Do not invent skills with no support in the inputs.
- Do not repeat duplicates.
- Return JSON only. No markdown fences, commentary, or extra text.

Return valid JSON only with this exact shape:
{
  "fromJobDescription": ["technical skills from the job description"],
  "fromExperience": ["technical skills evidenced in experience"],
  "fromProjects": ["technical skills evidenced in projects"]
}

Job description:
${state.jobDescription || context || 'None'}

Candidate headline: ${state.role || 'Not provided'}

Candidate experience:
${state.experienceSummary || state.experienceText || 'None'}

Candidate projects:
${state.projectsSummary || state.projectsText || 'None'}

Existing skills to keep if relevant: ${state.skillsText || 'None'}`;
    case 'project_skills':
      return `Extract ONLY real technical skills used in this single resume project.

What counts as a skill:
- Programming languages, frameworks, libraries, databases, cloud platforms, DevOps tools
- Technical tools (Git, Docker, Jira, Figma, Postman)
- Technical methodologies (Agile, Scrum, CI/CD, REST APIs)

What is NOT a skill — NEVER include these:
- Job duties, features, workflows, or business processes
- User roles, operational tasks, or domain nouns from project descriptions
- Random phrases, sentence fragments, or keywords copied from prose

Rules:
- Use only information from the project name and bullets below.
- Include technologies explicitly mentioned or clearly demonstrated in the project text.
- You may include job-description technologies only if they are also evidenced in this project.
- Do not invent skills with no support in the project text.
- Return JSON only. No markdown fences, commentary, or extra text.

Return valid JSON only:
{
  "skills": ["skill 1", "skill 2"]
}

Job description (for relevance only):
${state.jobDescription || context || 'None'}

Project:
${state.projectSummary || state.projectsSummary || context || 'None'}`;
    case 'validate_skills':
      return `You validate resume skill tags. Keep ONLY real professional/technical skills suitable for a resume Skills section.

KEEP examples: JavaScript, React, Python, AWS, Docker, PostgreSQL, REST APIs, Agile, Full-Stack Development, API Development.

REMOVE examples: support coming, housekeeping, cleaner roles, status updates, customer support workflows, feature names, job duties, business process phrases, sentence fragments, random project description words.

Rules:
- Every kept item must be a skill, tool, technology, framework, language, platform, or technical methodology.
- Remove anything that is a job duty, business feature, operational task, user role, or non-technical phrase.
- Preserve valid technical skill spelling from the candidate list when possible.
- Return JSON only. No markdown fences or commentary.

Return valid JSON only:
{
  "skills": ["valid skill 1", "valid skill 2"]
}

Candidate skills to validate:
${Array.isArray(state.skillCandidates) && state.skillCandidates.length ? state.skillCandidates.join(', ') : state.skillsText || 'None'}

Job description:
${state.jobDescription || context || 'None'}

Candidate experience:
${state.experienceSummary || state.experienceText || 'None'}

Candidate projects:
${state.projectsSummary || state.projectsText || 'None'}`;
    case 'categorize_skills':
      return `You are a resume skills analyst. Group each skill into exactly one professional resume category.

Rules:
- Every listed skill must appear in exactly one category.
- Use specific category names such as "Programming Languages", "Web Technologies", "Frameworks & Libraries", "Databases & Data", "Cloud & DevOps", "Tools & Platforms", "Soft Skills".
- You may add more specific categories when needed (examples: "Mobile Development", "Design Tools", "Data Science", "Testing & QA").
- NEVER use a category named "Other", "Miscellaneous", "General", or "Uncategorized".
- Keep the original skill spelling from the input list.
- Return valid JSON only with this exact shape:
{
  "categories": [
    { "name": "Web Technologies", "skills": ["HTML", "CSS", "JavaScript"] }
  ]
}

Skills to categorize:
${Array.isArray(state.skillNames) && state.skillNames.length ? state.skillNames.join(', ') : state.skillsText || 'None'}`;
    case 'experience':
      return `Write a professional work experience bullet summary for this profile: ${JSON.stringify(profile)}. Return plain text with bullet points.`;
    case 'ats':
      return `Review the following resume content and suggest ATS-friendly improvements. Return actionable suggestions as plain text: ${context || state.about}`;
    case 'grammar':
      return `Improve the grammar and clarity of this resume content. Keep the meaning the same. Remove vague filler such as "with proper error handling and validation" — replace with specific deliverables only if supported by the text. Return only the improved text: ${context || state.about}`;
    case 'rewrite':
      return `Rewrite this text to sound more polished and professional without changing the meaning. Return only the rewritten text: ${context || state.about}`;
    default:
      return `Generate helpful resume content based on this profile: ${JSON.stringify(profile)}. Context: ${context}`;
  }
};

const extractGeminiText = (json) =>
  json.candidates?.[0]?.content?.parts?.map((part) => part.text).join('').trim() ||
  json.candidates?.[0]?.output?.[0]?.content?.text ||
  json.candidates?.[0]?.content?.text ||
  json.text ||
  '';

const parseRetrySeconds = (message = '') => {
  const patterns = [
    /please try again in (\d+(?:\.\d+)?)\s*s(?:econds?)?/i,
    /retry in (\d+(?:\.\d+)?)\s*s(?:econds?)?/i,
    /retry after (\d+(?:\.\d+)?)\s*s(?:econds?)?/i,
  ];
  for (const pattern of patterns) {
    const match = String(message).match(pattern);
    if (match) return Math.max(1, Math.ceil(Number(match[1])));
  }
  return 60;
};

const isRateLimitMessage = (message = '') =>
  /quota|rate limit|resource has been exhausted|too many requests|high demand|exceeded your current/i.test(
    String(message),
  );

const createAiError = (message, { code, retryAfterSeconds } = {}) => {
  const error = new Error(message);
  error.code = code;
  error.retryAfterSeconds = retryAfterSeconds;
  return error;
};

const getMaxOutputTokens = (type) =>
  ['build_resume', 'parse_resume', 'parse_experience', 'parse_projects', 'parse_education', 'categorize_skills', 'job_skills', 'project_skills', 'validate_skills'].includes(type)
    ? 2000
    : 800;

const callGemini = async (apiKey, prompt, type) => {
  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.25,
      maxOutputTokens: getMaxOutputTokens(type),
    },
  });

  let lastError = 'AI request failed.';

  for (const model of GEMINI_FALLBACK_MODELS) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      },
    );

    const json = await response.json();
    if (!response.ok) {
      lastError = json.error?.message || 'AI request failed.';
      const keyFailure =
        response.status === 400 ||
        response.status === 401 ||
        response.status === 403 ||
        /invalid|api key|permission|unauthorized|authentication/i.test(lastError);
      if (keyFailure) throw new Error(lastError);
      if (response.status === 429 || response.status === 503 || isRateLimitMessage(lastError)) {
        throw createAiError('AI service is temporarily busy.', {
          code: 'AI_RATE_LIMIT',
          retryAfterSeconds: parseRetrySeconds(lastError),
        });
      }
      const retryable = response.status === 404 || /not found/i.test(lastError);
      if (retryable) continue;
      throw new Error(lastError);
    }

    const output = extractGeminiText(json);
    if (!output) {
      lastError = 'AI returned empty output.';
      continue;
    }

    return output;
  }

  if (isRateLimitMessage(lastError)) {
    throw createAiError('AI service is temporarily busy.', {
      code: 'AI_RATE_LIMIT',
      retryAfterSeconds: parseRetrySeconds(lastError),
    });
  }

  throw new Error(lastError);
};

const callOpenAI = async (apiKey, prompt, type) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.25,
      max_tokens: getMaxOutputTokens(type),
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    const message = json.error?.message || 'OpenAI request failed.';
    if (response.status === 429 || isRateLimitMessage(message)) {
      throw createAiError('AI service is temporarily busy.', {
        code: 'AI_RATE_LIMIT',
        retryAfterSeconds: parseRetrySeconds(message),
      });
    }
    throw new Error(message);
  }

  const output = json.choices?.[0]?.message?.content?.trim() || '';
  if (!output) throw new Error('OpenAI returned empty output.');
  return output;
};

const generateResumeContent = async (type, context, state, options = {}) => {
  const prompt = buildAIPrompt(type, context, state);
  const keyChain = await resolveUserAiKeyChain(options.userId);

  if (!keyChain.length) {
    throw createAiError(
      'Add a Gemini or ChatGPT API key in your Profile settings to generate resumes.',
      { code: 'AI_KEY_REQUIRED' },
    );
  }

  let lastError = 'AI request failed.';
  let sawRateLimit = false;
  let lastRetryAfterSeconds = 60;

  for (const entry of keyChain) {
    try {
      const output =
        entry.provider === 'openai'
          ? await callOpenAI(entry.key, prompt, type)
          : await callGemini(entry.key, prompt, type);
      return polishStructuredOutput(type, output);
    } catch (error) {
      lastError = error.message || 'AI request failed.';
      if (error.code === 'AI_RATE_LIMIT' || isRateLimitMessage(lastError)) {
        sawRateLimit = true;
        lastRetryAfterSeconds = error.retryAfterSeconds || parseRetrySeconds(lastError);
      }
      // Always try the next key/provider (Gemini → OpenAI) before giving up.
      continue;
    }
  }

  if (sawRateLimit) {
    const hasUserKeys = await userHasOwnAiKeys(options.userId);
    const busyMessage = hasUserKeys
      ? 'AI service is temporarily busy.'
      : 'Shared AI limits are reached. Please wait and try again, or add your own Gemini or ChatGPT API key in Profile settings.';
    throw createAiError(busyMessage, {
      code: 'AI_RATE_LIMIT',
      retryAfterSeconds: lastRetryAfterSeconds,
    });
  }

  const hasUserKeys = await userHasOwnAiKeys(options.userId);
  if (!hasUserKeys) {
    throw createAiError(
      'Shared AI is unavailable. Add your own Gemini or ChatGPT API key in Profile settings, then try again.',
      { code: 'AI_KEY_REQUIRED' },
    );
  }

  throw new Error(lastError);
};

module.exports = {
  buildAIPrompt,
  generateResumeContent,
};
