const { Payment } = require('../Models/PaymentModel');
const axios = require('axios');


const initializePayment = async (req, res) => {
  const { v4: uuidv4 } = await import('uuid');
  try {
    const { id } = req.user;
    const { taskId, beneficiary, amount } = req.body;

    const transactionRef = uuidv4();

    await Payment.create({
      taskId,
      initiator: id,
      beneficiary,
      amount,
      transactionRef,
    });

    res.status(200).json({ reference: transactionRef });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

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
      await Payment.findOneAndUpdate(
        { transactionRef: reference },
        {
          status: 'in_escrow',
          paymentMethod: data.channel,
          paymentChannel: data.authorization?.bank || null,
          mobileMoneyNumber: data.authorization?.mobile_money_number || null,
          fundedAt: new Date(),
        },
        { new: true }
      );
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
    const payment = await Payment.findOne({ transactionRef: reference });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status !== 'in_escrow') {
      return res
        .status(400)
        .json({ message: 'Payment not in escrow or already released/refunded' });
    }

    // Replace this with your stored beneficiary Paystack Recipient Code
    const recipientCode = payment.beneficiaryRecipientCode;
    if (!recipientCode) {
      return res
        .status(400)
        .json({ message: 'No Paystack recipient linked to beneficiary' });
    }

    // Transfer funds from your Paystack balance to the beneficiary
    const transferRes = await axios.post(
      'https://api.paystack.co/transfer',
      {
        source: 'balance',
        amount: payment.amount, // convert to kobo/pesewas
        recipient: recipientCode,
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
      status: 'released',
      releasedAt: new Date(),
      transferReference: transferData.reference,
    });

    res.status(200).json({
      message: 'Payment released successfully',
      transfer: transferData,
    });
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ message: 'Failed to release payment' });
  }
};

// =============== REFUND PAYMENT ===================
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

module.exports = {
  initializePayment,
  verifyPayment,
  releasePayment,
  refundPayment,
};
