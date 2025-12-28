const { Payment } = require('../Models/PaymentModel');
const axios = require('axios');


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

    const verifyRes = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = verifyRes.data.data;

    if (data.status === 'success') {
      
      await Payment.create({
      taskId,
      initiator: id,
      beneficiary,
      amount,
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
  try {
    const { reference } = req.params;

    const payment = await Payment.findOne({ transactionRef: reference })
      .populate('beneficiary', 'paystackRecipientCode')
      .populate('taskId', 'status');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
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
        message: 'No Paystack recipient linked to beneficiary',
      });
    }
    const companyFee = parseFloat((payment.amount * 0.12).toFixed(2));
    const freelancerAmount = parseFloat((payment.amount - companyFee).toFixed(2));   
    const paystackAmount =  Math.floor(freelancerAmount);
    console.log(recipientCode)
    console.log(paystackAmount)
    const transferRes = await axios.post(
      "https://api.paystack.co/transfer",
      {
        source: "balance",
        amount: paystackAmount,
        recipient: recipientCode,
        currency: 'GHS',
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


module.exports = {
  initializePayment,
  verifyPayment,
  releasePayment,
  refundPayment,
  ensureRecipientForBeneficiary,
};
