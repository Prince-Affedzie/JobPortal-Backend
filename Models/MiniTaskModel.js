const mongoose = require('mongoose')
const Schema = mongoose.Schema

const bidSchema = new Schema({
    bidder: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    message: { type: String }, 
    timeline: { type: String }, 
    status: { 
        type: String, 
        enum: ["Pending", "Accepted", "Rejected"], 
        default: "Pending" 
    },
    createdAt: { type: Date, default: Date.now }
});

const miniTaskSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    employer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    biddingType: { type: String, enum: ["fixed", "open-bid"], default: "fixed" }, 
    budget: { type: Number },
    finalAmount: { type: Number, default: null },

    deadline: { type: Date, required: true },
    locationType: { type: String, enum: ["remote", "on-site"], required: true },
    
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
            "Others"
        ],
    },
    subcategory:{ type: String },
    skillsRequired: [{ type: String }],

    requirements: [{ 
        type: String
    }],
 
    address:{
        region:String,
        city:String,
        suburb:String,
        latitude: Number,
        longitude: Number,
        coordinates: {
        type: [Number], 
        index: "2dsphere",
    }},

    applicants: [
        { type: mongoose.Schema.Types.ObjectId, ref: "User", default:[] }
    ],

     curatedPool: [{
      tasker: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      addedAt: { type: Date, default: Date.now },
      status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" }
    }],

    bids: [bidSchema], 

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignmentAccepted: { type: Boolean, default: false },

    status: { 
        type: String, 
        enum: [
            "Pending","Open","Assigned","In-progress","Review","Rejected","Completed","Closed"
        ], 
        default: "Pending" 
    },

    verificationRequired: { type: Boolean, default: false },
    proofOfCompletion: { type: String, default: null },

   
    markedDoneByEmployer: { type: Boolean, default: false },
    employerDoneAt: { type: Date, default: null },

    markedDoneByTasker: { type: Boolean, default: false },
    taskerDoneAt: { type: Date, default: null },
    funded:{type:Boolean,default:false},

},{timestamps:true})

// Auto-update status when both mark as done
miniTaskSchema.pre("save", function(next) {
    if (this.isModified("markedDoneByEmployer") && this.markedDoneByEmployer && !this.employerDoneAt) {
        this.employerDoneAt = new Date();
    }
    if (this.isModified("markedDoneByTasker") && this.markedDoneByTasker && !this.taskerDoneAt) {
        this.taskerDoneAt = new Date();
    }
    if (this.markedDoneByEmployer && this.markedDoneByTasker) {
        this.status = "Completed";
    }
    next();
});

miniTaskSchema.index({title:1})
miniTaskSchema.index({employer:1})
miniTaskSchema.index({description:1})

const MiniTask = mongoose.model("MiniTask", miniTaskSchema)
module.exports = { MiniTask }
