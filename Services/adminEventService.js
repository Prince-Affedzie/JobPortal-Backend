const { Alert, alertEmitter } = require('../Models/AlertModel');
//const { broadcastAdminAlert } = require('../Config/adminSocketIO');
const { UserModel } = require('../Models/UserModel')
const {JobModel} = require('../Models/JobsModel')
const {MiniTask} =require("../Models/MiniTaskModel")

const PRIORITY_MAP = {
  NEW_USER: 'MEDIUM',
  USER_VERIFICATION: 'HIGH',
  NEW_JOB_POSTING: 'MEDIUM',
  JOB_MODERATION: 'HIGH',
  DISPUTE_RAISED: 'CRITICAL',
  PAYMENT_PROCESSED: 'LOW',
  PAYMENT_FAILED: 'HIGH',
  TASK_COMPLETED: 'MEDIUM',
  REVIEW_SUBMITTED: 'LOW',
  ACCOUNT_FLAGGED: 'CRITICAL'
};

let broadcastAdminAlert = null;

alertEmitter.on('alertCreated', (alert) => {
  if (!broadcastAdminAlert) {
    console.warn('Socket.IO not initialized - queuing alert');
    // Optionally store in a queue to send later
    return;
  }
  broadcastAdminAlert(alert);
});

const createAlert = async (type, message, metadata = {}, relatedEntity = null) => {
  try {
    const alert = new Alert({
      type,
      message,
      priority: PRIORITY_MAP[type] || 'MEDIUM',
      metadata,
      relatedEntity: relatedEntity?._id,
      entityModel: relatedEntity?.constructor?.modelName
    });

    await alert.save();
    return alert;
  } catch (err) {
    console.error('Error creating alert:', err);
    return null;
  }
};

// Listen for model events
alertEmitter.on('alertCreated', (alert) => {
  broadcastAdminAlert(alert);
});

// Event handlers
const eventHandlers = {
  NEW_USER: async (user) => {
    //const isSuspicious = await checkSuspiciousUser(user);
    await createAlert(
      'NEW_USER',
      `New user registered: ${user.name}`,
      {
        userId: user._id,
        email: user.email,
        isVerified: user.isVerified,
        //suspicious: isSuspicious
      },
      user
    );
  },

  NEW_EMPLOYER_ACCOUNT: async (user) => {
    //const isSuspicious = await checkSuspiciousUser(user);
    await createAlert(
      'NEW_EMPLOYER_ACCOUNT',
      `New Employer Account registered: ${user.companyName}`,
      {
        userId: user._id,
        email: user.companyEmail,
        isVerified: user.isVerified,
        //suspicious: isSuspicious
      },
      user
    );
  },

  NEW_JOB_POSTING: async (job) => {
    const requiresModeration = job.description.length > 1000 || job.budget > 1000;
    await createAlert(
      requiresModeration ? 'JOB_MODERATION' : 'NEW_JOB_POSTING',
      `New ${requiresModeration ? ' LARGE ' : ''}job posted: ${job.title}`,
      {
        jobId: job._id,
        title: job.title,
        budget: job.budget,
        category: job.category
      },
      job
    );
  },

   NEW_MICRO_JOB_POSTING: async (job) => {
    const requiresModeration = job.description.length > 1000 || job.budget > 1000;
    await createAlert(
      requiresModeration ? 'MICRO_JOB_MODERATION' : 'NEW_MICRO_JOB_POSTING',
      `New ${requiresModeration ? ' LARGE ' : ''} micro job posted: ${job.title}`,
      {
        jobId: job._id,
        title: job.title,
        budget: job.budget,
        category: job.category
      },
      job
    );
  },

  MICRO_JOB_COMPLETION: async (job) => {
    const requiresModeration = job.description.length > 1000 || job.budget > 1000;
    await createAlert(
      'NEW_MICRO_JOB_COMPLETION',
      `A micro job Completed: ${job.title}`,
      {
        jobId: job._id,
        title: job.title,
        budget: job.budget,
        assigned: job.assignedTo
      },
      job
    );
  },


  DISPUTE_RAISED: async (dispute) => {
    const job = await MiniTask.findById(dispute.taskId);
    await createAlert(
      'DISPUTE_RAISED',
      `New dispute: ${dispute.reason}`,
      {
        disputeId: dispute._id,
        jobTitle: job?.title,
        reason: dispute.reason,
        parties: [dispute.raisedBy, dispute.against]
      },
      dispute
    );
  }
};

// Helper function
async function checkSuspiciousUser(user) {
  // Implement your fraud detection logic here
  const similarUsers = await  UserModel.countDocuments({ 
    ipAddress: user.ipAddress,
    createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  });
  return similarUsers > 3;
}

module.exports = {
  processEvent: (eventType, data) => {
    if (eventHandlers[eventType]) {
      eventHandlers[eventType](data);
    } else {
      console.warn(`No handler for event type: ${eventType}`);
    }
  },
  createAlert
};

module.exports.setBroadcaster = (broadcaster) => {
  broadcastAdminAlert = broadcaster;
};

