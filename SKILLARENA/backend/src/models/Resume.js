const mongoose = require('mongoose');

const resumeSectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    title: { type: String, default: '' },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    role: {
      type: String,
      trim: true,
      default: '',
    },
    about: {
      type: String,
      default: '',
    },
    jobDescription: {
      type: String,
      default: '',
    },
    projectsText: {
      type: String,
      default: '',
    },
    educationText: {
      type: String,
      default: '',
    },
    contact: {
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      location: { type: String, default: '' },
      customFields: {
        type: [
          {
            id: { type: String, required: true },
            label: { type: String, default: '' },
            value: { type: String, default: '' },
          },
        ],
        default: [],
      },
    },
    experiences: {
      type: [
        {
          id: { type: String, required: true },
          role: { type: String, default: '' },
          company: { type: String, default: '' },
          period: { type: String, default: '' },
          bullets: { type: [String], default: [] },
        },
      ],
      default: [],
    },
    projects: {
      type: [
        {
          id: { type: String, required: true },
          name: { type: String, default: '' },
          skills: { type: [String], default: [] },
          bullets: { type: [String], default: [] },
        },
      ],
      default: [],
    },
    educations: {
      type: [
        {
          id: { type: String, required: true },
          degree: { type: String, default: '' },
          shortName: { type: String, default: '' },
          institution: { type: String, default: '' },
          period: { type: String, default: '' },
          grade: { type: String, default: '' },
        },
      ],
      default: [],
    },
    color: {
      type: String,
      default: '#c45c26',
    },
    fontSize: {
      type: Number,
      default: 16,
    },
    fontFamily: {
      type: String,
      default: 'Inter, sans-serif',
    },
    theme: {
      type: String,
      default: 'light',
    },
    profileImage: {
      type: String,
      default: null,
    },
    sections: {
      type: [resumeSectionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

resumeSchema.index({ userId: 1, updatedAt: -1 });

const Resume = mongoose.model('Resume', resumeSchema);

module.exports = Resume;
