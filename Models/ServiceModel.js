const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        "Home Services",
        "Delivery & Errands",
        "Digital Services",
        "Writing & Assistance",
        "Learning & Tutoring",
        "Creative Tasks",
        "Event Support",
        "Others",
      ],
      required: true,
      index: true,
    },
    subCategory: {
      type: String,
      trim: true,
      default: null,
    },
    description: {
      type: String,
      maxlength: 2000,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    pricingUnit: {
      type: String,
      enum: ["hour", "task", "session", "day", "package"],
      default: "task",
    },
    
    durationEstimate: {
      type: String,
      default: null, // e.g. "1-2 hours"
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    media: {
      images: [String], // URLs
      video: String,
    },
  },
  { timestamps: true }
);

const Service = mongoose.model("Service", ServiceSchema);
module.exports = {Service}
