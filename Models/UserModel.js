const mongoose = require("mongoose");
const { isLowercase } = require("validator");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      index: true, // useful for searching by name (text search can be added too)
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true, // already creates a unique index
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      unique:true,
      default: null,
      index: true, // often searched by phone
    },
    role: {
      type: String,
      enum: ["job_seeker", "employer", "client", "admin"],
      required: true,
      index: true, // common grouping field
    },
    skills: [
      {
        type: String,
        default: [],
        index: true, // for matching users by skill
      },
    ],
    serviceTags: [{
    category: { type: String, required: true },
    subcategory: { type: String, required: true }
  }], 
    education: [
      {
        certification: String,
        institution: String,
        startedOn: Date,
        yearOfCompletion: Date,
      },
    ],
    workExperience: [
      {
        jobTitle: String,
        company: String,
        startDate: Date,
        endDate: Date,
        description: String,
      },
    ],
    workPortfolio: [
      {
        title: String,
        files: [{ publicUrl: String, name: String }],
        link: String,
        description: String,
      },
    ],
    profileImage: String,
    idCard: String,
    Bio: String,
    location: {
      region: { type: String, index: true },
      city: { type: String, index: true },
      town: String,
      street: String,
      latitude: Number,
      longitude: Number,
      coordinates: {
       type: [Number], 
       index: "2dsphere",
  },
    },
    appliedJobs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JOb",
        index: true,
      },
    ],
    appliedMiniTasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MiniTask",
        index: true,
      },
    ],
    profileCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    miniTaskEligible: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    vettingStatus: {
      type: String,
      enum: ["not_applied", "pending", "approved", "rejected"],
      default: "not_applied",
      index: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      index: true,
    },
    numberOfRatings: {
      type: Number,
      default: 0,
    },
    ratingsReceived: [
      {
        ratedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
          required: true,
        },
        feedback: {
          type: String,
          default: "",
        },
        createdAt: {
          type: Date,
          default: Date.now,
          index: true,
        },
       
      },
    ],
  availability: {
  status: {
    type: String,
    enum: ["available", "busy", "away", "offline", "suspended"],
    default: "available",
    index: true, 
  },
  lastActiveAt: {
    type: Date,
    default: Date.now, 
    index: true,
  },
  nextAvailableAt: {
    type: Date,
    default: null, 
  },
  autoPause: {
    type: Boolean,
    default: false, 
  },
},

paystackRecipientCode:{
  type:String,
  default:null
},

paymentMethods: [
  {
    type: {
      type: String,
      enum: ["mobile_money", "bank_account", "card"],
      required: true,
      index: true,
    },
    provider: {
      type: String,
      default: null, 
    },
    accountName: {
      type: String,
      required: false,
      trim: true,
    },
    accountNumber: {
      type: String,
      required: false,
      trim: true,
    },
    countryCode: {
      type: String,
      default: "GH", 
    },
    isDefault: {
      type: Boolean,
      default: false, 
      index: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
],
     pushToken:{
          type: String,
          default: null
    },

  },
  { timestamps: true }
);


userSchema.index({ role: 1, createdAt: -1 }); 
userSchema.index({ createdAt: -1 });          
userSchema.index({ location: 1 });           
userSchema.index({ skills: 1, role: 1 }); 

userSchema.index({
    
    name: 'text',
    skills: 'text',
    'serviceTags.category': 'text',
    'serviceTags.subcategory': 'text',
    
    
    'workExperience.jobTitle': 'text',
    'workExperience.description': 'text',
    'workPortfolio.title': 'text',
    Bio: 'text', 

}, {
    weights: {
        
        'serviceTags.category': 15,
        'serviceTags.subcategory': 15,
        skills: 12,
        'workExperience.jobTitle': 10,
        name: 8,
        Bio: 5,
        'workExperience.description': 3,
        'workPortfolio.title': 1,
    },
    name: "ProfileTextSearchIndex",
    default_language: "english", 
    language_override: "language",
});

const UserModel = mongoose.model("User", userSchema);
module.exports = { UserModel };
