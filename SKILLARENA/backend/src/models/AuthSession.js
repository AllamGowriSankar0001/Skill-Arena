const mongoose = require('mongoose');

const authSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    replacedBySessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AuthSession',
      default: null,
    },
    reuseDetectedAt: {
      type: Date,
      default: null,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    userAgent: {
      type: String,
      maxlength: 300,
      default: '',
    },
    ipHash: {
      type: String,
      maxlength: 64,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

authSessionSchema.index({ userId: 1, revokedAt: 1 });
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AuthSession = mongoose.model('AuthSession', authSessionSchema);

module.exports = AuthSession;
