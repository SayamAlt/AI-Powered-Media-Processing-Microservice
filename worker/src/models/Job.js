const mongoose = require('mongoose');

const labelSchema = new mongoose.Schema({
  description: String,
  score: Number,
}, { _id: false });

const safetySchema = new mongoose.Schema({
  adult: String,
  spoof: String,
  medical: String,
  violence: String,
  racy: String,
}, { _id: false });

const jobSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalName: { type: String, required: true },
  storagePath: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  caption: String,
  labels: [labelSchema],
  safetyResult: safetySchema,
  flagged: { type: Boolean, default: false },
  flaggedCategories: [String],
  error: String,
  attempts: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);