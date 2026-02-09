const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    tasker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

   
    service: {
      type: mongoose.Schema.Types.ObjectId, 
      ref:'Service',
      required: true,
      index: true,
    },

    description: {
      type: String,
      required: true,
    },

    
    address: {
      region: String,
      city: String,
      suburb: String,
      latitude: Number,
      longitude: Number,
      coordinates: {
        type: [Number],
        index: "2dsphere",
      },
    },

    // --- Scheduling ---
    preferredDate: Date,
    preferredTime: String,

    
    media: [
      {
        url: String,
        type: { type: String, enum: ["image", "video"] },
        stage: { type: String, enum: ["before", "after"], default: "before" },
      },
    ],


     price: { type: Number, default: null },

    creditsUsed: {
      type: Number,
      default: 0,
    },

    creditsDeducted: {
      type: Boolean,
      default: false,
    },

    unlockedAt: {
      type: Date,
      default: null,
    },

    // --- Disclosure control ---
    disclosureLevel: {
      type: Number,
      enum: [1, 2, 3], // 1 = basic, 2 = unlocked, 3 = arrived
      default: 1,
    },

    
    verification: {
      qrCode: String,
      pinCode: String,
      arrivalConfirmedAt: Date,
      completionRequestedAt: Date,
      completionConfirmedAt: Date,
    },

    
    status: {
      type: String,
      enum: [
        "PENDING",          // sent to tasker
        "LOCKED",           // credits used, details unlocked
        "ACCEPTED",
        "DECLINED",
        "ARRIVAL_PENDING",
        "ARRIVED",
        "IN_PROGRESS",
        "COMPLETION_REQUESTED",
        "COMPLETED",
        "DISPUTED",
        "NO_SHOW",
        "CANCELLED",
      ],
      default: "PENDING",
      index: true,
    },

    
    arrivalDeadline: Date,
    arrivalMissed: { type: Boolean, default: false },

    statusHistory: [
      {
        status: String,
        at: { type: Date, default: Date.now },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],

   
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", BookingSchema);
