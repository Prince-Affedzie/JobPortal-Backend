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
const sendPasswordResetEmail = async(recipient,message)=>{
  try{
     console.log(recipient)
    const response = await resend.emails.send({
      from: `Workaflow <noreply@mail.workaflow.live>`, // You can replace with your verified domain sender
      to: recipient,
      subject: `Password Reset Request`,
      html: message,
    });

     console.log('Password Reset Link Sent', response);

  }catch(err){
    console.log("Error sending password reset email: ", err)
  }
}

module.exports = { sendInterviewInviteEmail,sendPasswordResetEmail };
