const mongoose = require("mongoose")
const { isLowercase } = require("validator")
const Schema = mongoose.Schema

const userSchema = new Schema({
    name:{
        type: String,
        required: true
    },
    email:{
        type: String,
        required:true,
        lowercase: true,
        trim: true,
        unique:true
    },
    password:{
        type: String,
        required: true
    },
    phone:{
        type: String,
        required:false,
        default:null
    },
    role:{
        type:String,
        enum:["job_seeker", "employer", "admin"],
        required:true

    },
    skills:[
        {
            type:String,
             default:[]

        }
    ],
    education:[{
        certification: String,
        institution: String,
        startedOn:Date,
        yearOfCompletion: Date,   
    }],

    workExperience:[{
        jobTitle: String,
        company: String,
        startDate: Date,
        endDate: Date,
        description: String

    }],

    workPortfolio: [
    {
      title: String,
      url: String,
      description: String,
    },
  ],

    profileImage:{
        type:String
    },
    idCard:{
        type: String
    },
    Bio:{
        type: String
    },
    location:{
        region:String,
        city: String,
        town : String,
        street: String
    },
    appliedJobs:[
        {
        type:mongoose.Schema.Types.ObjectId,
        ref:"JOb"
    }],
    appliedMiniTasks:[
             {
            type: mongoose.Schema.Types.ObjectId,
            ref:'MiniTask'

             }
    ],
    profileCompleted: {
        type: Boolean,
        default: false
    },
   
    miniTaskEligible:{
        type: Boolean,
        default:false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isVerified:{
         type:Boolean,
         default:false
    },

    vettingStatus: {
    type: String,
    enum: ["not_applied", "pending", "approved", "rejected"],
    default: "not_applied",
  },

   rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },

  numberOfRatings: {
    type: Number,
    default: 0,
  },

  ratingsReceived: [
    {
      ratedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Could be job seeker or employer
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
        default: '',
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }
  ],


},{timestamps:true})

const UserModel = mongoose.model("User",userSchema)
module.exports = {UserModel}