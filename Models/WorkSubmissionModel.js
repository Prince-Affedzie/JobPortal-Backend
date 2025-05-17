const mongoose = require('mongoose')

const workSubmissionSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'MiniTask', required: true },
  freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  files: [String],
  message: {
    type: String,
   
  },
  status: { type: String, enum: ['pending', 'approved', 'revision_requested','rejected','disputed'], default: 'pending' },

  feedback:{
    type:  String
  },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: Date,

   expireAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    index: { expires: 0 } // TTL index triggers auto-deletion
  }
},{timestamps:true});

const WorkSubmissionModel = mongoose.model('WorkSubmission',workSubmissionSchema)

module.exports = {WorkSubmissionModel}
