const mongoose = require('mongoose')
const {EventEmitter} = require('events')
const schema = mongoose.Schema;

const alertSchema = new schema({
    type:{
        type: String,
        enum: [
        'NEW_USER',
         'NEW_EMPLOYER_ACCOUNT',
         'USER_VERIFICATION',
         'NEW_JOB_POSTING',
         'NEW_MICRO_JOB_POSTING',
         'JOB_MODERATION',
         'DISPUTE_RAISED',
         'PAYMENT_PROCESSED',
         'PAYMENT_FAILED',
         'MICRO_JOB_COMPLETION',
         'REVIEW_SUBMITTED',
         'ACCOUNT_FLAGGED'
    ],
    required: true
    },
    message:{
        type: String,
        required: true
    },
    priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  isRead: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed },
  relatedEntity: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'entityModel'
  },

  entityModel: {
    type: String,
    enum: ['User', 'Job', 'Dispute', 'Payment','MiniTask']
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
}
)

alertSchema.index({ isRead: 1 });
alertSchema.index({ priority: 1 });
alertSchema.index({ createdAt: -1 });
alertSchema.index({ type: 1 });


const alertEmitter = new EventEmitter()

alertSchema.post('save', function(doc) {
  alertEmitter.emit('alertCreated', doc);
});

const Alert = mongoose.model("Alert",alertSchema);

module.exports = {Alert,alertEmitter};