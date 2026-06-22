const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES, USER_STATUSES } = require('../constants/enums');
const { rankFromLevel } = require('../utils/level');
const { encryptSecret } = require('../utils/secretCrypto');
const { hasStoredKey } = require('../utils/aiKeyStorage');
const { normalizeResumeProfile, emptyResumeProfile } = require('../utils/resumeProfile');

const encryptedKeySchema = {
  ciphertext: { type: String, default: '' },
  iv: { type: String, default: '' },
  tag: { type: String, default: '' },
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    originalPassword: {
      type: String,
      select: false,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'STUDENT',
    },
    status: {
      type: String,
      enum: USER_STATUSES,
      default: 'ACTIVE',
    },
    interestedSkillIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill',
      },
    ],
    learningGoal: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    lastActiveAt: {
      type: Date,
    },
    aiKeys: {
      type: {
        gemini: encryptedKeySchema,
        openai: encryptedKeySchema,
      },
      default: () => ({}),
      select: false,
    },
    resumeProfile: {
      type: {
        dateOfBirth: { type: String, default: '' },
        gender: {
          type: String,
          enum: ['', 'male', 'female', 'non_binary', 'other', 'prefer_not_to_say'],
          default: '',
        },
        phone: { type: String, default: '' },
        githubUrl: { type: String, default: '' },
        portfolioUrl: { type: String, default: '' },
        linkedinUrl: { type: String, default: '' },
        skills: { type: [String], default: [] },
        projects: {
          type: [
            {
              id: { type: String, required: true },
              name: { type: String, default: '' },
              skills: { type: [String], default: [] },
              bullets: { type: [String], default: [] },
              description: { type: String, default: '' },
            },
          ],
          default: [],
        },
        certifications: {
          type: [
            {
              id: { type: String, required: true },
              name: { type: String, default: '' },
              issuer: { type: String, default: '' },
              year: { type: String, default: '' },
              url: { type: String, default: '' },
            },
          ],
          default: [],
        },
      },
      default: () => emptyResumeProfile(),
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ status: 1 });
userSchema.index({ interestedSkillIds: 1 });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    return next();
  }

  const plainPassword = this.password;
  const isAlreadyHashed =
    typeof plainPassword === 'string'
    && (plainPassword.startsWith('$2a$') || plainPassword.startsWith('$2b$'));

  if (!isAlreadyHashed) {
    this.originalPassword = plainPassword;
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(plainPassword, salt);
  }

  next();
});

userSchema.methods.comparePassword = async function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.setAiKey = function setAiKey(provider, plaintext) {
  if (!this.aiKeys) this.aiKeys = {};
  const value = String(plaintext || '').trim();
  if (!value) {
    this.aiKeys[provider] = { ciphertext: '', iv: '', tag: '' };
    return;
  }
  this.aiKeys[provider] = encryptSecret(value);
};

userSchema.methods.toPublicJSON = function toPublicJSON(stats) {
  const base = {
    id: this._id,
    name: this.name,
    email: this.email,
    avatarUrl: this.avatarUrl,
    role: this.role,
    status: this.status,
    interestedSkillIds: this.interestedSkillIds,
    learningGoal: this.learningGoal,
    onboardingCompleted: this.onboardingCompleted,
    lastActiveAt: this.lastActiveAt,
    createdAt: this.createdAt,
    hasGeminiApiKey: hasStoredKey(this.aiKeys?.gemini),
    hasOpenaiApiKey: hasStoredKey(this.aiKeys?.openai),
    resumeProfile: normalizeResumeProfile(this.resumeProfile),
  };

  if (this.role === 'ADMIN') {
    return base;
  }

  const level = stats?.level ?? 1;

  return {
    ...base,
    xp: stats?.totalXp ?? 0,
    level,
    currentLevelXp: stats?.currentLevelXp ?? 0,
    nextLevelXp: stats?.nextLevelXp ?? 100,
    currentStreak: stats?.currentStreak ?? 0,
    battlesWon: stats?.battlesWon ?? 0,
    coursesStarted: stats?.coursesEnrolled ?? 0,
    coursesCompleted: stats?.coursesCompleted ?? 0,
    rank: rankFromLevel(level),
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
