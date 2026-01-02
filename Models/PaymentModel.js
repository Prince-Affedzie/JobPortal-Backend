const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const paymentSchema = new Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'taskType',
      required: true,
    },
    taskType: {
    type: String,
    required: true,
    enum: ['MiniTask', 'ServiceRequest'] 
  },
    initiator: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      required: true,
    },
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      required: true,
    },
    amount: {
      type: Number, 
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "GHS", 
    },
    status: {
      type: String,
      enum: ["pending", "in_escrow", "released", "refunded", "failed"],
      default: "pending",
    },
    transactionRef: {
      type: String, 
    },
    paymentMethod: {
      type: String,
      enum: ["mobile_money", "card", "bank", "wallet","momo"],
      default: "mobile_money",
    },
    paymentChannel: {
    type: String, 
  },
   
   mobileMoneyNumber: {
    type: String,
  },
  },
  { timestamps: true }
);
const Payment = mongoose.model("Payment",paymentSchema)

module.exports = {Payment}
