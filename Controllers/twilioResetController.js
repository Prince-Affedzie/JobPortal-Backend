const express = require('express');
const twilioRouter = express.Router();
const twilio = require('twilio');
const bcrypt = require('bcryptjs');
const { UserModel } = require('../Models/UserModel'); // Adjust path to your user model

// Your Twilio credentials
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const verifySid = process.env.TWILIO_VERIFY_SID;

const formatPhoneNumber = (phone) => {
  if (!phone.startsWith("+")) {
    // Assume Ghana (+233)
    if (phone.startsWith("0")) {
      return "+233" + phone.slice(1);
    }
    return "+233" + phone;
  }
  return phone;
};

// 1 Send OTP to user phone
twilioRouter.post('/send-otp', async (req, res) => {
  const { phoneNumber } = req.body;
  console.log(req.body)

  try {
    const user = await UserModel.findOne({phone: phoneNumber });
    if (!user) return res.status(404).json({ message: 'User not found' });
     const twilioPhoneNumberFormat = formatPhoneNumber(phoneNumber)
    await client.verify.v2.services(verifySid).verifications.create({
      to: twilioPhoneNumberFormat,
      channel: 'sms',
    });

    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: 'Error sending OTP', error: err.message });
  }
});

// 2 Verify OTP and reset password
twilioRouter.post('/verify-reset-otp', async (req, res) => {
  const { phoneNumber, code, newPassword } = req.body;
  const twilioPhoneNumberFormat = formatPhoneNumber(phoneNumber)
  try {
    const verificationCheck = await client.verify.v2.services(verifySid).verificationChecks.create({
      to: twilioPhoneNumberFormat,
      code,
    });

    if (verificationCheck.status !== 'approved') {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await UserModel.findOneAndUpdate({ phone: phoneNumber }, { password: hashedPassword });

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: 'Error verifying OTP', error: err.message });
  }
});



twilioRouter.post('/verify-phone-number', async (req, res) => {
  const { phoneNumber, code, newPassword } = req.body;

  try {
    const verificationCheck = await client.verify.v2.services(verifySid).verificationChecks.create({
      to: phoneNumber,
      code,
    });

    if (verificationCheck.status !== 'approved') {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await UserModel.findOneAndUpdate({ phone: phoneNumber }, { password: hashedPassword });

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: 'Error verifying OTP', error: err.message });
  }
});

module.exports = {twilioRouter};
