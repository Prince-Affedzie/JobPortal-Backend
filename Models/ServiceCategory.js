const mongoose = require("mongoose");

const ServiceCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },   // e.g., "Home Repairs"
  icon: { type: String },                   // Optional UI icon
  description: { type: String },
  subcategories: [
    {
      name: String,                         // e.g. "Electrician"
      keywords: [String],                   // ["wiring", "lights", "installation"]
      image: String                         // Category thumbnail
    }
  ],
  isFeatured: { type: Boolean, default: false } // For homepage display
});

const ServiceCategory = mongoose.model('ServiceCategory',ServiceCategorySchema)
module.exports = {ServiceCategory}
