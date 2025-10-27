const mongoose = require("mongoose");

const ServiceRequestSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    assignedTasker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, 
    },
    
    description: { type: String, maxlength: 2000 },
      
    location: {
        address: { type: String },
        lat: { type: Number },
        lng: { type: Number },
      },

    requirements:[{
        type: String
    }],

    preferredDate: { type: Date },

    preferredTime:{
        type:Number
    },

    urgency: {
        type: String,
        enum: ["flexible", "urgent", "scheduled"],
        default: "flexible",
      },

    attachments: [String], 
    
     budget: {
      type: Number,
      min: 0,
      default: null,
    },

    pricing: {
      estimatedCost: { type: Number, min: 0 },
      finalCost: { type: Number, min: 0 },
      currency: { type: String, default: "GHS" },
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "rejected",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },

    payment: {
      method: {
        type: String,
        enum: ["mobile_money", "card", "cash", "wallet"],
        default: "mobile_money",
      },

      transactionId: { type: String },
      isPaid: { type: Boolean, default: false },
      paidAt: { type: Date },
    },

    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
    },
    markedDoneByClient: { type: Boolean, default: false },
    clientDoneAt: { type: Date, default: null },

    markedDoneByTasker: { type: Boolean, default: false },
    taskerDoneAt: { type: Date, default: null },
},
  { timestamps: true }
);

const  ServiceRequest =  mongoose.model("ServiceRequest", ServiceRequestSchema);
module.exports = {ServiceRequest}
