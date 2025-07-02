// models/Dispute.js
const mongoose = require('mongoose');

const DisputeSchema = new mongoose.Schema({
  raisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  against: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  taskId:{
     type: mongoose.Schema.Types.ObjectId,
     ref:'MiniTask'
  },
  submissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkSubmission',
  
  },
  reason: {
    type: String,
    required: true
  },
  details: {
    type: String
  },
  status: {
    type: String,
    enum: ['open', 'under_review', 'resolved', 'reassigned'],
    default: 'open'
  },
  resolutionNotes: {
    type: String
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Dispute', DisputeSchema);
