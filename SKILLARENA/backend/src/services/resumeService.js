const Resume = require('../models/Resume');
const User = require('../models/User');
const { generateResumeContent } = require('./aiService');

const defaultSections = () => [
  {
    id: 'hero',
    type: 'hero',
    title: 'Hero',
    data: { blurb: '' },
  },
  {
    id: 'skills',
    type: 'skills',
    title: 'Skills',
    data: { items: [] },
  },
  {
    id: 'experience',
    type: 'experience',
    title: 'Work Experience',
    data: { items: [] },
  },
];

const deriveTitle = (resume) => {
  if (resume.title?.trim()) return resume.title.trim();
  if (resume.role?.trim()) return resume.role.trim();
  if (resume.jobDescription?.trim()) {
    const line = resume.jobDescription.trim().split('\n')[0].slice(0, 60);
    return line || 'Untitled resume';
  }
  if (resume.name?.trim()) return `${resume.name.trim()}'s resume`;
  return 'Untitled resume';
};

const normalizeContact = (contact = {}) => ({
  email: contact.email || '',
  phone: contact.phone || '',
  linkedin: contact.linkedin || '',
  location: contact.location || '',
  customFields: Array.isArray(contact.customFields)
    ? contact.customFields
        .map((field) => ({
          id: field.id || `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          label: field.label || '',
          value: field.value || '',
        }))
        .filter((field) => field.label.trim() || field.value.trim())
    : [],
});

const hasResumeContent = (resume) => {
  if (!resume) return false;
  if (resume.jobDescription?.trim()) return true;
  if (resume.about?.trim()) return true;
  if (resume.role?.trim()) return true;
  if (resume.projectsText?.trim()) return true;
  if (resume.educationText?.trim()) return true;

  const contact = normalizeContact(resume.contact);
  if (
    contact.email?.trim() ||
    contact.phone?.trim() ||
    contact.linkedin?.trim() ||
    contact.location?.trim() ||
    contact.customFields.some((field) => field.value?.trim())
  ) {
    return true;
  }

  if (resume.experiences?.some((item) => item.role?.trim() || item.company?.trim() || item.bullets?.length)) {
    return true;
  }
  if (resume.projects?.some((item) => item.name?.trim() || item.bullets?.length)) {
    return true;
  }
  if (
    resume.educations?.some(
      (item) => item.degree?.trim() || item.institution?.trim() || item.grade?.trim(),
    )
  ) {
    return true;
  }

  const skillsSection = resume.sections?.find((section) => section.type === 'skills');
  const skillItems = skillsSection?.data?.items || [];
  if (skillItems.length) return true;

  return false;
};

const formatResume = (resume) => ({
  id: resume._id.toString(),
  userId: resume.userId?._id?.toString() || resume.userId?.toString(),
  userName: resume.userId?.name || null,
  userEmail: resume.userId?.email || null,
  title: deriveTitle(resume),
  name: resume.name || '',
  role: resume.role || '',
  about: resume.about || '',
  jobDescription: resume.jobDescription || '',
  projectsText: resume.projectsText || '',
  educationText: resume.educationText || '',
  contact: normalizeContact(resume.contact),
  experiences: resume.experiences || [],
  projects: resume.projects || [],
  educations: resume.educations || [],
  color: resume.color || '#c45c26',
  fontSize: resume.fontSize || 16,
  fontFamily: resume.fontFamily || 'Inter, sans-serif',
  theme: resume.theme || 'light',
  profileImage: resume.profileImage || null,
  sections: resume.sections?.length ? resume.sections : defaultSections(),
  updatedAt: resume.updatedAt,
  createdAt: resume.createdAt,
});

const formatResumeSummary = (resume) => ({
  id: resume._id.toString(),
  title: deriveTitle(resume),
  name: resume.name || '',
  role: resume.role || '',
  updatedAt: resume.updatedAt,
  createdAt: resume.createdAt,
});

const buildResumeUpdate = (payload) => ({
  name: payload.name?.trim() ?? '',
  role: payload.role?.trim() ?? '',
  about: payload.about ?? '',
  jobDescription: payload.jobDescription ?? '',
  projectsText: payload.projectsText ?? '',
  educationText: payload.educationText ?? '',
  contact: normalizeContact(payload.contact),
  experiences: payload.experiences || [],
  projects: payload.projects || [],
  educations: payload.educations || [],
  color: payload.color || '#c45c26',
  fontSize: payload.fontSize || 16,
  fontFamily: payload.fontFamily || 'Inter, sans-serif',
  theme: payload.theme || 'light',
  profileImage: payload.profileImage ?? null,
  sections: payload.sections?.length ? payload.sections : defaultSections(),
  title: payload.title?.trim() || deriveTitle(payload),
});

const getOrCreateResume = async (userId) => {
  let resume = await Resume.findOne({ userId }).sort({ updatedAt: -1 }).populate('userId', 'name email');
  if (resume) {
    return formatResume(resume);
  }

  const user = await User.findById(userId).select('name');
  resume = await Resume.create({
    userId,
    name: user?.name || '',
    sections: defaultSections(),
  });

  const populated = await Resume.findById(resume._id).populate('userId', 'name email');
  return formatResume(populated);
};

const listMyResumes = async (userId) => {
  const resumes = await Resume.find({ userId }).sort({ updatedAt: -1 });
  return resumes
    .filter(hasResumeContent)
    .map(formatResumeSummary);
};

const createResume = async (userId) => {
  const user = await User.findById(userId).select('name');
  const resume = await Resume.create({
    userId,
    name: user?.name || '',
    sections: defaultSections(),
  });

  const populated = await Resume.findById(resume._id).populate('userId', 'name email');
  return formatResume(populated);
};

const getResumeById = async (userId, resumeId) => {
  const resume = await Resume.findOne({ _id: resumeId, userId }).populate('userId', 'name email');
  if (!resume) {
    throw new Error('Resume not found.');
  }
  return formatResume(resume);
};

const saveResume = async (userId, payload) => {
  if (payload.id) {
    return saveResumeById(userId, payload.id, payload);
  }

  const existing = await Resume.findOne({ userId }).sort({ updatedAt: -1 });
  if (existing) {
    return saveResumeById(userId, existing._id.toString(), payload);
  }

  const user = await User.findById(userId).select('name');
  const resume = await Resume.create({
    userId,
    ...buildResumeUpdate({
      ...payload,
      name: payload.name?.trim() || user?.name || '',
    }),
  });

  const populated = await Resume.findById(resume._id).populate('userId', 'name email');
  return formatResume(populated);
};

const saveResumeById = async (userId, resumeId, payload) => {
  const resume = await Resume.findOneAndUpdate(
    { _id: resumeId, userId },
    { $set: buildResumeUpdate(payload) },
    { new: true },
  ).populate('userId', 'name email');

  if (!resume) {
    throw new Error('Resume not found.');
  }

  return formatResume(resume);
};

const runResumeAI = async (userId, type, context, stateOverride) => {
  const resume = stateOverride || (await getOrCreateResume(userId));
  const output = await generateResumeContent(type, context, resume, { userId });
  return { output, resume: stateOverride || resume };
};

const listResumesForAdmin = async () => {
  const resumes = await Resume.find()
    .populate('userId', 'name email role')
    .sort({ updatedAt: -1 });

  return resumes.map(formatResume);
};

const deleteResume = async (userId) => {
  const latest = await Resume.findOne({ userId }).sort({ updatedAt: -1 });
  if (latest) {
    await Resume.findByIdAndDelete(latest._id);
  }
  return getOrCreateResume(userId);
};

const deleteResumeByUserAndId = async (userId, resumeId) => {
  const deleted = await Resume.findOneAndDelete({ _id: resumeId, userId });
  if (!deleted) {
    throw new Error('Resume not found.');
  }
  return { id: resumeId };
};

const deleteResumeById = async (resumeId) => {
  const deleted = await Resume.findByIdAndDelete(resumeId);
  if (!deleted) {
    throw new Error('Resume not found.');
  }
  return { id: resumeId };
};

module.exports = {
  getOrCreateResume,
  listMyResumes,
  createResume,
  getResumeById,
  saveResume,
  saveResumeById,
  runResumeAI,
  listResumesForAdmin,
  deleteResume,
  deleteResumeByUserAndId,
  deleteResumeById,
  defaultSections,
  hasResumeContent,
};
