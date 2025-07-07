const mongoose = require('mongoose')

const workSubmissionSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'MiniTask', required: true },
  freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  files: [{
    fileKey: String
  }
],
  message: {
    type: String,
   
  },
  status: { type: String, enum: ['pending', 'approved', 'revision_requested','rejected','disputed'], default: 'pending' },

  feedback:{
    type:  String
  },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: Date,

},{timestamps:true});

const WorkSubmissionModel = mongoose.model('WorkSubmission',workSubmissionSchema)
workSubmissionSchema.index({taskId:1})
module.exports = {WorkSubmissionModel}
