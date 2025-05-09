const mongoose = require('mongoose')
const schema = mongoose.Schema

const interviewSchema = new schema({
    invitedBy :{
        type: mongoose.Schema.Types.ObjectId,
        ref:'EmployerProfile'
    },
    invitationsTo:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    }],
    message:{
        type:String
    },
    jobId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'JOb'
    },
    interviewDate:{
        type: Date
    },
    interviewTime:{
        type: String
    },
    location:{
        type: String
    }

},{timestamps:true})

const Interview = mongoose.model('Interview',interviewSchema)
module.exports ={Interview}