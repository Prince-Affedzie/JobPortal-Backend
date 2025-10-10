// src/services/notificationService.js
const {NotificationModel} = require('../Models/NotificationModel');
const {sendPushNotification} = require('./expo-server-notification-sdk')
const { UserModel } = require('../Models/UserModel');

class NotificationService {
  constructor(socketIO = null) {
    this.socketIO = socketIO;
  }

  /**
   * Sends a notification and optionally emits it via Socket.IO
   * @param {Object} options
   * @param {string} options.userId - Recipient user ID
   * @param {string} options.message - Notification message
   * @param {string} options.title - Notification title
   * @returns {Promise<Notification>} The created notification
   */
  async sendNotification({ userId, message, title }) {
    try {

       const user = await UserModel.findById(userId).select('pushToken');
       const pushToken = user?.pushToken;

      const notification = await NotificationModel.create({
        user: userId,
        message,
        title
      });

      // Emit via Socket.IO if available
      if (this.socketIO) {
        this.socketIO.to(userId.toString()).emit('notification', notification);
        console.log(`Socket notification sent to user ${userId}`);
      }

      if (pushToken) {
        await sendPushNotification(pushToken, title, message);
        console.log(`Push notification sent to user ${userId}`);
      } else {
        console.log(`No push token found for user ${userId}, skipping push notification`);
      }
      
      await notification.save();
      return notification;
    } catch (error) {
      console.log('Failed to send notification', { error, userId });
      throw new Error('Failed to send notification');
    }
  }

  /**
   * Sends a job application notification
   * @param {Object} options
   * @param {string} options.employerId - The job poster's user ID
   * @param {string} options.jobTitle - The job title
   * @param {string} options.applicantName - Name of the applicant
   * @returns {Promise<Notification>}
   */
  async sendJobApplicationNotification({ employerId, jobTitle, applicantName }) {
    return this.sendNotification({
      userId: employerId,
      message: `Great news! ${applicantName} has submitted an application for your "${jobTitle}" position. Review their profile and qualifications in your applications dashboard to consider them for the role.`,
      title: "🎯 New Job Application Received"
    });
  }

  /**
   * Sends micro job assignment notification to freelancer
   */
  async sendMicroJobAssignmentNotification({ freelancerId, jobTitle, clientName }) {
    return this.sendNotification({
      userId: freelancerId,
      message: `Congratulations! ${clientName} has selected you for the "${jobTitle}" task. Please visit your Tasks Applications page to review the assignment details and confirm your acceptance within 2 hours to secure this opportunity.`,
      title: "🚀 Task Assignment - Action Required"
    });
  }

  /**
   * Sends micro job application notification to client
   */
  async sendMicroJobApplicationNotification({ clientId, jobTitle, taskerName }) {
    return this.sendNotification({
      userId: clientId,
      message: `You have a new interest shown from ${taskerName} for your "${jobTitle}" micro task. Review their proposal and profile to find the perfect match for your project requirements.`,
      title: "📥 New Task Application"
    });
  }

  /**
   * Sends bid notification to client
   */
  async sendBidNotification({ clientId, jobTitle, bidderName, bidAmount }) {
    return this.sendNotification({
      userId: clientId,
      message: `${bidderName} has submitted a bid of ₵${bidAmount} for your "${jobTitle}" task. Review their proposal, timeline, and profile to evaluate if they're the right fit for your project.`,
      title: "💰 New Bid Received"
    });
  }

  /**
   * Sends bid acceptance notification to freelancer
   */
  async sendBidAcceptedNotification({ freelancerId, jobTitle, clientName }){
    return this.sendNotification({
      userId: freelancerId,
      message: `Excellent! ${clientName} has accepted your bid for "${jobTitle}". The task has been assigned to you. Please visit your Micro Tasks Applications page to review project details and confirm your commitment to deliver quality work.`,
      title: "✅ Bid Accepted - Task Assigned"
    });
  }

  /**
   * Sends micro job acceptance notification to client
   */
  async sendMicroJobAcceptanceNotification({ username, clientId, jobTitle }) {
    return this.sendNotification({
      userId: clientId,
      message: `Great news! ${username} has officially accepted the "${jobTitle}" task assignment. They're now committed to delivering your project. You can monitor progress and communicate directly through the task management dashboard.`,
      title: "🤝 Task Acceptance Confirmed"
    });
  }

  /**
   * Sends micro job rejection notification to client
   */
  async sendMicroJobRejectionNotification({ username, clientId, jobTitle }) {
    return this.sendNotification({
      userId: clientId,
      message: `${username} has declined the "${jobTitle}" task assignment. We recommend reviewing other qualified applicants in your dashboard to find an alternative tasker for your project.`,
      title: "⚠️ Task Assignment Declined"
    });
  }

  /**
   * Sends interview invitation to freelancer
   */
  async sendInterviewInviteNotification({ freelancerId, jobTitle, clientName }) {
    return this.sendNotification({
      userId: freelancerId,
      message: `Congratulations! ${clientName} has invited you to an interview for the "${jobTitle}" position. Please check your email for detailed scheduling information and preparation guidelines. Respond promptly to secure your interview slot.`,
      title: "📅 Interview Invitation"
    });
  }

  /**
   * Sends interview cancellation notification
   */
  async sendInterviewInviteCancellationNotification({ freelancerId, jobTitle, clientName }) {
    return this.sendNotification({
      userId: freelancerId,
      message: `The interview invitation from ${clientName} for "${jobTitle}" has been cancelled. We encourage you to continue exploring other opportunities in our platform that match your skills and availability.`,
      title: "❌ Interview Cancelled"
    });
  }

  /**
   * Sends task completion notification from tasker to client
   */
  async sendTaskerMarkedDoneNotification({ clientId, taskTitle, taskerName }) {
    return this.sendNotification({
      userId: clientId,
      message: `${taskerName} has marked "${taskTitle}" as completed. Please review the delivered work and confirm completion within 48 hours to release payment and provide valuable feedback about your experience.`,
      title: "📋 Task Awaiting Your Review"
    });
  }

  /**
   * Sends task completion notification from client to tasker
   */
  async sendClientMarkedDoneNotification({ taskerId, taskTitle, clientName }) {
    return this.sendNotification({
      userId: taskerId,
      message: `Thank you for your great work! ${clientName} has confirmed completion of "${taskTitle}". Once both parties confirm, the task will be officially closed and your payment will be processed according to our payment schedule.`,
      title: "⭐ Work Approved by Client"
    });
  }

  /**
   * Sends final task completion notifications to both parties
   */
  async sendTaskCompletedNotification({ clientId, taskerId, taskTitle }) {
    await this.sendNotification({
      userId: clientId,
      message: `The "${taskTitle}" has been successfully completed and closed. Thank you for using our platform! We hope you're satisfied with the delivered work. Please consider leaving a review to help build our community's trust.`,
      title: "🎉 Task Successfully Completed"
    });

    await this.sendNotification({
      userId: taskerId,
      message: `Congratulations on successfully completing "${taskTitle}"! Your payment has been queued for processing. Thank you for your professional service. We look forward to seeing you take on more great projects.`,
      title: "🏆 Task Completed Successfully"
    });
  }

  /**
   * Sends payment processing notification
   */
  async sendPaymentProcessingNotification({ userId, amount, taskTitle }) {
    return this.sendNotification({
      userId,
      message: `Your payment of ₵${amount} for "${taskTitle}" is being processed. Funds will be available in your account within 3-5 business days according to our payment policy.`,
      title: "💳 Payment Processing"
    });
  }

  /**
   * Sends payment completed notification
   */
  async sendPaymentCompletedNotification({ userId, amount, taskTitle }) {
    return this.sendNotification({
      userId,
      message: `Great news! Payment of ₵${amount} for "${taskTitle}" has been successfully processed and is now available in your account. Thank you for your trust in our platform.`,
      title: "✅ Payment Received"
    });
  }

  /**
   * Sends reminder notification for pending actions
   */
  async sendReminderNotification({ userId, actionType, taskTitle, deadline }) {
    const messages = {
      'accept_assignment': `Reminder: You have 24 hours to accept the "${taskTitle}" assignment. Please review and confirm your participation to avoid losing this opportunity.`,
      'submit_work': `Friendly reminder: The deadline for "${taskTitle}" is approaching. Please ensure you submit your work on time to maintain your excellent rating.`,
      'review_work': `Reminder: Please review the completed work for "${taskTitle}" within the next 24 hours. Your timely feedback helps taskers get paid promptly.`,
      'complete_profile': `Complete your profile to get more tasks! A complete profile increases your chances of being selected by 60%. Take 2 minutes to add your skills and experience.`
    };

    return this.sendNotification({
      userId,
      message: messages[actionType] || `Reminder: Action required for "${taskTitle}"`,
      title: "⏰ Reminder"
    });
  }

  /**
   * Sends rating and review notification
   */
  async sendRatingNotification({ userId, taskTitle, ratedByName }) {
    return this.sendNotification({
      userId,
      message: `${ratedByName} has left a rating and review for your work on "${taskTitle}". Check your profile to see how your performance is being recognized in our community.`,
      title: "⭐ New Rating Received"
    });
  }

  /*
  send dispute raised Notification
  */
 async sendDisputeRaisedNotification({ opponent, taskTitle, reportedBy }) {
  return this.sendNotification({
    userId: opponent,
    message: `We want to let you know that ${reportedBy} has raised a concern regarding the "${taskTitle}" task. Our support team has been notified and will review the situation carefully. We're here to ensure a fair resolution for everyone involved and will reach out to you shortly to discuss next steps. Thank you for your patience.`,
    title: "🤝 Concern Raised - Task Under Review"
  });
}


async sendDisputeResolvedNotification({ party1,party2, taskTitle, resolution, caseId }) {
   await this.sendNotification({
    userId:party1,
    message: `The dispute for "${taskTitle}" (Case #${caseId}) has been successfully resolved. Resolution: ${resolution}. The task has been updated accordingly and normal operations can resume. Thank you for your patience and cooperation throughout the review process.`,
    title: "✅ Dispute Resolved - Case Closed"
  });

  await this.sendNotification({
    userId:party2,
    message: `The dispute for "${taskTitle}" (Case #${caseId}) has been successfully resolved. Resolution: ${resolution}. The task has been updated accordingly and normal operations can resume. Thank you for your patience and cooperation throughout the review process.`,
    title: "✅ Dispute Resolved - Case Closed"
  });
}


/**
 * Sends work submission notification to client
 */
async sendWorkSubmissionNotification({ clientId, taskTitle, freelancerName, submissionId }) {
  return this.sendNotification({
    userId: clientId,
    message: `${freelancerName} has submitted work for your task "${taskTitle}". Please review the submission and provide feedback within 48 hours to keep the project moving forward. You can access the submission details from your task management dashboard.`,
    title: "📤 Work Submitted for Review"
  });
}

async sendWorkSubmissionConfirmation({ freelancerId, taskTitle }) {
  return this.sendNotification({
    userId: freelancerId,
    message: `Your work for "${taskTitle}" has been successfully submitted! The client has been notified and will review your submission. You'll be notified once they provide feedback or approval. You can still modify your submission until the client starts their review.`,
    title: "✅ Submission Confirmed"
  });
}

async sendSubmissionApprovedNotification({ freelancerId, taskTitle, clientName, feedback = null }) {
  const feedbackText = feedback ? ` Client Feedback: "${feedback}"` : ' The client is satisfied with your delivered work.';
  
  return this.sendNotification({
    userId: freelancerId,
    message: `Great news! ${clientName} has approved your submission for "${taskTitle}".${feedbackText} The task will now move to the completion phase and your payment will be processed according to our payment schedule.`,
    title: "🎉 Work Approved!"
  });
}

async sendRevisionRequestedNotification({ freelancerId, taskTitle, clientName, feedback }) {
  return this.sendNotification({
    userId: freelancerId,
    message: `${clientName} has requested revisions for "${taskTitle}". Feedback: "${feedback}". Please review the requested changes and submit an updated version. The client is waiting for your revised submission to proceed.`,
    title: "🔄 Revisions Requested"
  });
}


async sendSubmissionRejectedNotification({ freelancerId, taskTitle, clientName, feedback }) {
  return this.sendNotification({
    userId: freelancerId,
    message: `${clientName} has declined your submission for "${taskTitle}". Feedback: "${feedback}". You may submit a new version addressing the feedback, or contact the client directly to discuss their requirements further.`,
    title: "⚠️ Submission Needs Improvement"
  });
}

}

module.exports = NotificationService;