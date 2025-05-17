const mongoose = require('mongoose')
const Schema = mongoose.Schema

const miniTaskSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    employer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    budget: { type: Number, required: true }, // Fixed or hourly budget
    deadline: { type: Date, required: true }, // Short deadline for mini tasks
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
    subcategory:{
        type: String
    },
    skillsRequired: [{ type: String }],
    address:{
        region:String,
        city:String,
        suburb:String
    },
    applicants: [
        { type: mongoose.Schema.Types.ObjectId, ref: "User", default:[] }
       ], // Users who applied
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // Assigned worker
    assignmentAccepted: { type: Boolean, default: false },
    status: { type: String, enum: ["Open", "In-progress","Review","Rejected","Completed", "Closed","Assigned"], default: "Open" },
    verificationRequired: { type: Boolean, default: false }, // For preventing scams
    proofOfCompletion: { type: String, default: null },
},{timestamps:true})

const MiniTask = mongoose.model("MiniTask",miniTaskSchema)
module.exports ={MiniTask}