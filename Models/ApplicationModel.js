const mongoose = require("mongoose")
const schema = mongoose.Schema

const jobApplicationSchema = new schema({
    job :{
        type: mongoose.Schema.Types.ObjectId,
        ref:"JOb"
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    resume:{
        type:String
    },
    coverLetter:{
        type:String
    },
    
    inviteForInterview:{
        type:Boolean,
        default:false
    },
    interview: {
        scheduled: { type: Boolean, default: false },
        date: Date,
        message: String
      },
      
    reviewer:{
       type :mongoose.Schema.Types.ObjectId,
       ref:"User"

    },
    status:{
        type:String,
        enum:["Pending","Accepted","Rejected","Completed","Reviewing","Shortlisted","Offered",'Interviewing'],
        default:"Pending"
    }
},{timestamps:true})

const ApplicationModel = mongoose.model("Application",jobApplicationSchema)
module.exports = {ApplicationModel}