const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY); // Make sure RESEND_API_KEY is in your .env

const sendInterviewInviteEmail = async (sender, recipients, message) => {
  console.log("I'm executing");

  try {
    const response = await resend.emails.send({
      from: `${sender.companyName} <noreply@mail.workaflow.live>`, // You can replace with your verified domain sender
      to: recipients,
      subject: `${sender.companyName} Invites You for a Job Interview`,
      text: message,
    });

    console.log('Interview Invite Sent:', response);
  } catch (err) {
    console.error('Error sending Interview Invite email:', err);
  }
};

module.exports = { sendInterviewInviteEmail };
