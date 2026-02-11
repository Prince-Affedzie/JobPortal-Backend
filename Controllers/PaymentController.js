const { Payment } = require('../Models/PaymentModel');
const { MiniTask } = require("../Models/MiniTaskModel");
const {UserModel} = require('../Models/UserModel')
const {ServiceRequest} = require( "../Models/ServiceRequestModel.js");
const axios = require('axios');


const CREDIT_PACKAGES = [
  { id: 'basic', name: 'Basic', credits: 12, price: 30 },      // 30 GHS => 12 credits
  { id: 'standard', name: 'Standard', credits: 24, price: 50 }, // 50 GHS => 24 credits
  { id: 'premium', name: 'Premium', credits: 36, price: 70 },   // 70 GHS => 36 credits
  { id: 'business', name: 'Business', credits: 50, price: 120 }, // 120 GHS => 50 credits
];


function getCreditsFromAmount(amount) {
  // Find the package that matches the exact amount
  const matchedPackage = CREDIT_PACKAGES.find(pkg => pkg.price === amount);

  if (!matchedPackage) {
    return null; // no matching package
  }

  return matchedPackage.credits;
}


const initializePayment = async (req, res) => {
  const { v4: uuidv4 } = await import('uuid');
  try {
    const transactionRef = uuidv4();
    res.status(200).json({ reference: transactionRef });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


const verifyPayment = async (req, res) => {
  try {
     const { id } = req.user;
     const { reference } = req.params;
     const { taskId, beneficiary, amount } = req.body;
     let taskType
     const [miniTaskExists, serviceRequestExists] = await Promise.all([
       MiniTask.exists({ _id: taskId }),
       ServiceRequest.exists({ _id: taskId })
      ]);

    if (miniTaskExists) {
     taskType = "MiniTask";
   } else if (serviceRequestExists) {
     taskType = "ServiceRequest";
   } else {
    return res.status(404).json({ message: "Task or Service Request not Found" });
   }


    const verifyRes = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = verifyRes.data.data;
    const verifiedAmount = data.amount / 100;

    if (data.status === 'success') {
      
      await Payment.create({
      taskId,
      taskType,
      initiator: id,
      beneficiary,
      amount:verifiedAmount,
      transactionRef: reference,
      status: 'in_escrow',
      paymentMethod: data.channel,
      paymentChannel: data.authorization?.bank || null,
      mobileMoneyNumber: data.authorization?.mobile_money_number || null,
      fundedAt: new Date(),
      });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

const releasePayment = async (req, res) => {
  const { v4: uuidv4 } = await import('uuid');
  try {
    const { reference } = req.params;

    const payment = await Payment.findOne({ transactionRef: reference })
      .populate('beneficiary', 'paystackRecipientCode')
      .populate('taskId', 'status');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (!payment.taskId) {
    return res.status(404).json({ message: 'Task details not found' });
  }

    if (payment.taskId.status !== "Completed") {
      return res.status(400).json({ message: 'This task must be completed before payment is released' });
    }

    if (payment.status !== 'in_escrow') {
      return res.status(400).json({
        message: 'Payment not in escrow or already released/refunded',
      });
    }

    const recipientCode = payment.beneficiary.paystackRecipientCode;
    if (!recipientCode) {
      return res.status(400).json({
        message: 'No Paystack recipient linked to beneficiary. Please make sure to add a payment method and set it as default',
      });
    }
    const companyFee = parseFloat((payment.amount * 0.12).toFixed(2));
    const freelancerAmount = parseFloat((payment.amount - companyFee).toFixed(2));   
    const paystackAmount =  Math.floor(freelancerAmount);
    const paystackAmountInPesewas = Math.round(freelancerAmount * 100);
    const payoutreference = uuidv4();
   

    const transferRes = await axios.post(
      "https://api.paystack.co/transfer",
      {
        source: "balance",
        amount: paystackAmountInPesewas,
        recipient: recipientCode,
        currency: 'GHS',
        reference: payoutreference,
        reason: `Escrow release for task ${payment.taskId}`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const transferData = transferRes.data.data;

    await Payment.findByIdAndUpdate(payment._id, {
      status: "released",
      releasedAt: new Date(),
      transferReference: transferData.reference,
      companyFee: companyFee,
      freelancerAmount: freelancerAmount,
    });

    res.status(200).json({
      message: "Payment released successfully (12% fee deducted)",
      transfer: transferData,
      companyFee,
      freelancerAmount,
    });
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ message: "Failed to release payment" });
  }
};

const refundPayment = async (req, res) => {
  try {
    const { reference } = req.params;
    const payment = await Payment.findOne({ transactionRef: reference });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status !== 'in_escrow') {
      return res
        .status(400)
        .json({ message: 'Only escrowed payments can be refunded' });
    }

    // Issue refund using Paystack Refund API
    const refundRes = await axios.post(
      'https://api.paystack.co/refund',
      { transaction: reference },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    await Payment.findByIdAndUpdate(payment._id, {
      status: 'refunded',
      refundedAt: new Date(),
    });

    res.status(200).json({
      message: 'Payment refunded successfully',
      refund: refundRes.data.data,
    });
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ message: 'Failed to refund payment' });
  }
};


const ensureRecipientForBeneficiary = async (beneficiary, paymentMethod) => {
  if (!beneficiary) throw new Error("No beneficiary provided");

  if (beneficiary.paystackRecipientCode) {
    return beneficiary.paystackRecipientCode;
  }

  console.log('Payment Method:', paymentMethod);

  // Convert phone to international format if necessary
  let phone = paymentMethod.accountNumber;
  if (phone.startsWith("0")) {
    phone = "233" + phone.substring(1);
  }

  // Map your provider IDs to Paystack bank codes
  const providerToBankCode = {
    'mtn_momo': 'MTN',        // Correct code for MTN Mobile Money
    'vodafone_cash': 'VOD',   // Correct code for Vodafone Cash
    'airtel_tigo': 'ATL',     // Correct code for AirtelTigo Money
    'bank_transfer': ''       // This might need different handling
  };

  const bankCode = providerToBankCode[paymentMethod.provider];
  
  if (!bankCode && paymentMethod.provider !== 'bank_transfer') {
    throw new Error(`Unsupported payment provider: ${paymentMethod.provider}`);
  }

  const payload = {
    type: "mobile_money",
    name: paymentMethod.accountName.trim(), // Added trim() to remove extra spaces
    currency: "GHS",
    account_number: paymentMethod.accountNumber,
    bank_code: bankCode,
  };

  console.log('Paystack Payload:', payload);

  try {
    const res = await axios.post("https://api.paystack.co/transferrecipient", payload, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    console.log('Paystack Response:', res.data);

    if (!res?.data?.status) {
      throw new Error(res.data.message || "Failed to create Paystack recipient");
    }

    return res.data.data.recipient_code;
  } catch (error) {
    console.error('Paystack API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Failed to create payment recipient");
  }
};

const getUserCredits = async(req,res)=>{
  try{
    console.log("I'm being called")
    const {id}= req.user
    const user =await UserModel.findById(id)
    res.status(200).json(user.credits)

  }catch (error) {
    console.error('PError:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Failed to fetch credits");
  }
}

const initializeCreditPurchase = async (req, res) => {
  const { v4: uuidv4 } = await import('uuid');
  try {
    const transactionRef = uuidv4();
    res.status(200).json({ reference: transactionRef });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


const verifyCreditPurchase = async (req, res) => {
  try {
    const { id } = req.user; // authenticated user
    const { reference } = req.params;
    console.log(req.pqarams)

    // Verify payment with Paystack
    const verifyRes = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = verifyRes.data.data;
    const verifiedAmount = data.amount / 100; // Kobo -> GHS

    if (data.status === 'success') {
      // Step 4: Get credits from verified amount
      const creditsToAdd = getCreditsFromAmount(verifiedAmount);

      if (!creditsToAdd) {
        return res.status(400).json({ message: 'Invalid amount, no matching package found' });
      }

      // Update user's credits
      const user = await UserModel.findByIdAndUpdate(
        id,
        { $inc: { credits: creditsToAdd } },
        { new: true }
      );

      return res.status(200).json({
        message: `Payment verified! ${creditsToAdd} credits added to your account.`,
        credits: user.credits,
        paymentData: data,
      });
    } else {
      return res.status(400).json({ message: 'Payment not successful', paymentData: data });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
};


module.exports = {
  initializePayment,
  verifyPayment,
  releasePayment,
  refundPayment,
  ensureRecipientForBeneficiary,
  initializeCreditPurchase,
  verifyCreditPurchase,
  getUserCredits,
};
