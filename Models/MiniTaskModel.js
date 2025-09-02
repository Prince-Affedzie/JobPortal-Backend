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
    budget: { type: Number }, // Client’s expected budget (can be null if open to bids)
   

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
    
    address:{
        region:String,
        city:String,
        suburb:String
    },

    applicants: [
        { type: mongoose.Schema.Types.ObjectId, ref: "User", default:[] }
    ],

    bids: [bidSchema], 

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignmentAccepted: { type: Boolean, default: false },

    status: { 
        type: String, 
        enum: ["Open", "In-progress","Review","Rejected","Completed", "Closed","Assigned"], 
        default: "Open" 
    },

    verificationRequired: { type: Boolean, default: false },
    proofOfCompletion: { type: String, default: null },

},{timestamps:true})

miniTaskSchema.index({title:1})
miniTaskSchema.index({employer:1})
miniTaskSchema.index({description:1})

const MiniTask = mongoose.model("MiniTask",miniTaskSchema)
module.exports ={MiniTask}
