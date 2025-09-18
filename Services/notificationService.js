// src/services/notificationService.js
const {NotificationModel} = require('../Models/NotificationModel');
//const logger = require('../utils/logger');

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

      await notification.save();
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
   * @returns {Promise<Notification>}
   */
  async sendJobApplicationNotification({ employerId, jobTitle }) {
    return this.sendNotification({
      userId: employerId,
      message: `New Pending Application Received for your job posting "${jobTitle}".`,
      title: "New Job Application"
    });
  }

  async sendMicroJobAssignmentNotification({ freelancerId, jobTitle }) {
    return this.sendNotification({
      userId: freelancerId,
      message: `Congratulations! You've been assigned to the mini task: "${jobTitle}".Please Visit Your Micro Tasks Applications
      Page to confirm your stands.`,
      title: "Micro Task Assignment"
    });
  }

   async sendMicroJobApplicationNotification({ clientId, jobTitle }) {
    return this.sendNotification({
      userId: clientId,
      message: `You've gotten a new Application for your MiniTask with the title: ${jobTitle} `,
      title: "Micro Task Application"
    });
  }

  async sendBidNotification({ clientId, jobTitle }) {
    return this.sendNotification({
      userId: clientId,
      message: `You've gotten a new Bid for your MicroTask with the title: ${jobTitle} `,
      title: "Micro Task Bidding"
    });
  }

  async sendBidAcceptedNotification({freelancerId ,jobTitle}){
     return this.sendNotification({
      userId: freelancerId,
      message: `Congratulations! You've been assigned to the mini task: "${jobTitle}". Please Visit Your Micro Tasks Applications
      Page to confirm your stands.`,
      title: "Micro Task Assignment"
    });
  };

  async sendMicroJobAcceptanceNotification({ username, clientId, jobTitle }) {
    return this.sendNotification({
      userId: clientId,
      message: `${ username} has accepted the Mini Task you assigned to`,
      title: "Micro Task Acceptance"
    });
  }

  async sendMicroJobRejectionNotification({ username, clientId, jobTitle }) {
    return this.sendNotification({
      userId: clientId,
      message: `${ username} has rejected the Mini Task you assigned to `,
      title: "Micro TaskRejection"
    });
  }

  async sendInterviewInviteNotification({ freelancerId, jobTitle }) {
    return this.sendNotification({
      userId: freelancerId,
      message: `Congratulations! You've been invited to an Interview For this Job: "${jobTitle}". Please check  your email for more details or contact the employer.`,
      title: "Invite For An Interview"
    });
  }

   async sendInterviewInviteCancellationNotification({ freelancerId, jobTitle }) {
    return this.sendNotification({
      userId: freelancerId,
      message: `Congratulations! You've been invited to an Interview For this Job: "${jobTitle}". Please contact the employer for more details.`,
      title: "Invite For An Interview"
    });
  }


  async sendTaskerMarkedDoneNotification({ clientId, taskTitle }) {
    return this.sendNotification({
      userId: clientId,
      message: `The tasker has marked the task "${taskTitle}" as done. Please review and confirm.`,
      title: "Task Marked as Done"
    });
  }

   async sendClientMarkedDoneNotification({ taskerId, taskTitle }) {
    return this.sendNotification({
      userId: taskerId,
      message: `The client has marked the task "${taskTitle}" as done. Once both confirm, the task will be completed.`,
      title: "Task Marked as Done"
    });
  }

  async sendTaskCompletedNotification({ clientId, taskerId, taskTitle }) {
    await this.sendNotification({
      userId: clientId,
      message: `The task "${taskTitle}" has been successfully completed. Thank you!`,
      title: "Task Completed"
    });

    await this.sendNotification({
      userId: taskerId,
      message: `The task "${taskTitle}" has been successfully completed. Great job!`,
      title: "Task Completed"
    });
  }

}

module.exports = NotificationService;