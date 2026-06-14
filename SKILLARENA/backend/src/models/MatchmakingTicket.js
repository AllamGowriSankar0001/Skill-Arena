const mongoose = require('mongoose');
const {
  BATTLE_FORMATS,
  BATTLE_MODES,
  DIFFICULTIES,
  MATCHMAKING_STATUSES,
} = require('../constants/enums');

const matchmakingTicketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    status: {
      type: String,
      enum: MATCHMAKING_STATUSES,
      default: 'SEARCHING',
    },
    matchedBattleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Battle',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

matchmakingTicketSchema.index({
  status: 1,
  format: 1,
  mode: 1,
  skillId: 1,
  difficulty: 1,
});
matchmakingTicketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
matchmakingTicketSchema.index({ userId: 1, status: 1 });

const MatchmakingTicket = mongoose.model('MatchmakingTicket', matchmakingTicketSchema);

module.exports = MatchmakingTicket;
