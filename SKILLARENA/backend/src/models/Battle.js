const mongoose = require('mongoose');
const {
  BATTLE_FORMATS,
  BATTLE_MODES,
  MATCH_TYPES,
  DIFFICULTIES,
  BATTLE_STATUSES,
  PARTICIPANT_STATUSES,
  TEAMS,
  WINNER_TYPES,
} = require('../constants/enums');

const battleParticipantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    team: {
      type: String,
      enum: TEAMS,
      required: true,
    },
    status: {
      type: String,
      enum: PARTICIPANT_STATUSES,
      default: 'INVITED',
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
    },
    correctAnswers: {
      type: Number,
      default: 0,
      min: 0,
    },
    wrongAnswers: {
      type: Number,
      default: 0,
      min: 0,
    },
    assessmentAttemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentAttempt',
    },
    joinedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  { _id: false },
);

const battleRewardsSchema = new mongoose.Schema(
  {
    winnerXp: { type: Number, default: 0, min: 0 },
    participantXp: { type: Number, default: 0, min: 0 },
    drawXp: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const battleSchema = new mongoose.Schema(
  {
    battleCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    format: {
      type: String,
      enum: BATTLE_FORMATS,
      required: true,
    },
    mode: {
      type: String,
      enum: BATTLE_MODES,
      required: true,
    },
    matchType: {
      type: String,
      enum: MATCH_TYPES,
      required: true,
    },
    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      required: true,
    },
    difficulty: {
      type: String,
      enum: DIFFICULTIES,
      default: 'MIXED',
    },
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    maximumPlayers: {
      type: Number,
      required: true,
      min: 2,
      max: 6,
    },
    participants: {
      type: [battleParticipantSchema],
      default: [],
    },
    status: {
      type: String,
      enum: BATTLE_STATUSES,
      default: 'WAITING',
    },
    winnerType: {
      type: String,
      enum: WINNER_TYPES,
    },
    winnerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    winnerTeam: {
      type: String,
      enum: TEAMS,
    },
    rewards: {
      type: battleRewardsSchema,
      default: () => ({}),
    },
    scheduledAt: {
      type: Date,
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

battleSchema.index({ 'participants.userId': 1, status: 1 });
battleSchema.index({ skillId: 1, format: 1, status: 1 });
battleSchema.index({ createdAt: -1 });

const Battle = mongoose.model('Battle', battleSchema);

module.exports = Battle;
