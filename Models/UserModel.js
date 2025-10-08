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
  },
  { timestamps: true }
);


userSchema.index({ role: 1, createdAt: -1 }); 
userSchema.index({ createdAt: -1 });          
userSchema.index({ location: 1 });           
userSchema.index({ skills: 1, role: 1 });     

const UserModel = mongoose.model("User", userSchema);
module.exports = { UserModel };
