const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true, 
    unique: true, 
    trim: true
  },
  slug: { type: String, unique: true }, 
  icon: { type: String }, 
  description: { type: String },
  parentCategory: {
    type: String,
    enum: ["Home Services", "Digital", "Events", "Logistics","Writing", "Assistance"],
    required: true
  },
  providers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Service = mongoose.model("Service", ServiceSchema);

module.exports = {Service}