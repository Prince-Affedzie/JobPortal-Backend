const mongoose = require("mongoose");

const ServiceRequestSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: { type: String, required: true },
    description: { type: String, required: true },
    assignedTasker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, 
    },
     
     address:{
        region:String,
        city:String,
        suburb:String,
        latitude: Number,
        longitude: Number,
        coordinates: {
        type: [Number], 
        index: "2dsphere",
    }
  },

    requirements:[{
        type: String
    }],

    media: [
   {
    url: String,
    type: { type: String, enum: ["image", "video"] }
   }
 ],

 status: { 
        type: String, 
        enum: [
            "Pending", "Quoted","Booked","In-progress","Review","Canceled","Completed","Closed"
        ], 
        default: "Pending" 
    },

    preferredDate: { type: Date },

    preferredTime:{
        type:String,
    },

    urgency: {
        type: String,
        enum: ["flexible", "urgent", "scheduled"],
        default: "flexible",
      },
    
     budget: {
      type: Number,
      min: 0,
      default: null,
    },
    
    notifiedTaskers: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  ],


   offers: [
    {
      tasker: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      amount: Number,
      message: String,
      status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
      createdAt: { type: Date, default: Date.now },
    }
  ],


    finalCost: { type: Number, default: null },

    markedDoneByEmployer: { type: Boolean, default: false },

    employerDoneAt: { type: Date, default: null },

    markedDoneByTasker: { type: Boolean, default: false },

    taskerDoneAt: { type: Date, default: null },

    funded:{type:Boolean,default:false},

    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
    },
 
},
  { timestamps: true }
);

const  ServiceRequest =  mongoose.model("ServiceRequest", ServiceRequestSchema);
module.exports = {ServiceRequest}
