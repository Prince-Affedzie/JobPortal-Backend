// models/EmployerProfile.js
const mongoose = require('mongoose');

const employerProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  
  companyName: { type: String, required: true },
  companyEmail: { type: String, required: true },
  companyLine:{type:String},
  companyLocation:{type: String },
  companyWebsite: { type: String },
  
  businessDocs: {
      type: String,
     
    },
  isVerified: { type: Boolean, default: false },
  verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  verificationNotes: { type: String },
  postedJobs:[
    {type: mongoose.Schema.Types.ObjectId, ref:"JOb"},    
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('EmployerProfile', employerProfileSchema);
