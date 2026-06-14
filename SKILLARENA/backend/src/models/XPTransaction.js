const mongoose = require('mongoose');
const { XP_TRANSACTION_TYPES, XP_SOURCE_TYPES } = require('../constants/enums');

const xpTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    transactionType: {
      type: String,
      enum: XP_TRANSACTION_TYPES,
      required: true,
    },
    sourceType: {
      type: String,
      enum: XP_SOURCE_TYPES,
      required: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

xpTransactionSchema.index({ userId: 1, createdAt: -1 });
xpTransactionSchema.index({ userId: 1, sourceType: 1 });

const XPTransaction = mongoose.model('XPTransaction', xpTransactionSchema);

module.exports = XPTransaction;
