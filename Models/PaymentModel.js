const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const paymentSchema = new Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MiniTask",
      required: true,
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
      enum: ["momo", "card", "bank", "wallet"],
      default: "momo",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
