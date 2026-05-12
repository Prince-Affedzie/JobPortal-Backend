const mongoose = require("mongoose");

const taskerProfileSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true, 
        unique: true 
    },
    // --- BRANDING SECTION ---
    providerType: { 
        type: String, 
        enum: ["individual", "business"], 
        default: "individual" 
    },
    businessName: { 
        type: String, 
        trim: true,
        index: true // Searchable brand name
    },
    brandBanner: { 
        type: String, 
        default: null // URL to a professional header image
    },
    tagline: { 
        type: String, 
        maxlength: 100 // e.g., "Accra's #1 Reliable Electricians"
    },

    servicesOffered: [{
        serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
        name: { type: String, required: true }, // e.g., "Deep Carpet Cleaning"
        description: String,
        priceType: { 
            type: String, 
            enum: ["fixed", "hourly", "starts_at", "negotiable"], 
            default: "negotiable" 
        },
        price: { type: Number, default: 0 },
        currency: { type: String, default: "GHS" }
    }],

    // --- OPERATIONAL DATA ---
    bio: { type: String }, // Now acts as a "Company About Us"
    workPortfolio: [{
        title: String,
        description: String,
        images: [String], // Array of project photos
        completedAt: Date
    }],
    
    // --- TRUST & VERIFICATION ---
    businessRegistrationNo: { type: String, default: null }, // For companies
    isVerified: { type: Boolean, default: false },
    vettingStatus: { 
        type: String, 
        enum: ["not_applied", "pending", "approved", "rejected"], 
        default: "not_applied" 
    },

    appliedMiniTasks:[{
        type:mongoose.Schema.Types.ObjectId, 
        ref:'MiniTask'
    }],

    // --- RATINGS & LOGISTICS ---
    rating: { type: Number, default: 0, index: true },
    numberOfRatings: { type: Number, default: 0 },
    location: {
        region: String,
        city: String,
        coordinates: { type: [Number], index: "2dsphere" } // Crucial for local Accra discovery
    },
    
    // --- GROWTH METRICS ---
    credits: { type: Number, default: 12 }, // For bidding on tasks
    score: { type: Number, default: 0 },   // Internal platform ranking
    
}, { timestamps: true });

// Massive Text Search Index for Business Discovery
taskerProfileSchema.index({
    businessName: 'text',
    tagline: 'text',
    'servicesOffered.name': 'text',
    bio: 'text'
}, {
    weights: {
        businessName: 20,
        'servicesOffered.name': 15,
        tagline: 10,
        bio: 5
    },
    name: "BusinessStorefrontSearch"
});

module.exports= mongoose.model("TaskerProfile", taskerProfileSchema);