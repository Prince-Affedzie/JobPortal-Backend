const mongoose = require("mongoose")
const schema = mongoose.Schema

const jobSchema = new schema({
    title:{
        type: String,
        required: true
    },
    description:{
        type: String,
        required:true
    },
    category:{
        type :String,
       
        enum: ["Administration",'Banking','Development','Marketing','Software Development','Administrative Assistance','Sales',
            'Accounting','Information Technology','Health','Education','Design','Engineering','Human Resources','Project Management','Customer Service',
             'Agriculture','Tourism and Hospitality','Consulting','Finance','Non-profit and NGO','Legal','Manufacturing','Logistics and Supply Chain',
             'others'
        ]
    },
    jobType:{
        type:String,
        enum:['Full-Time','Part-Time','Mini-Task','Errands','Contract','Freelance','Volunteer'],
        required: true,
    },
    industry:{
        type:String

    },
    company:{
          type:String
    },
    companyEmail:{
        type: String
    },
    deliveryMode:{
        type:String,
        enum:['In-Person','Remote','Hybrid']
    },
    location:{
        region:String,
        city:String,
        street:String

    },
    employerId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    employerProfileId:{
           type: mongoose.Schema.Types.ObjectId,
           ref:'EmployerProfile'
    },
    paymentStyle:{
        type: String,
        
        enum:['Fixed','Range','Negotiable','Hourly','Monthly']
    },
    salary:{
        type: String,
        
    },
    skillsRequired:[{
        type: String
    }],
    experienceLevel:{
        type: String,
        enum:["Entry","Intermediate","Senior"]
    },
    responsibilities:[{
        type: String
    }],
    deadLine:{
        type: Date
    },
    status:{
        type: String,
        enum:['Opened','Closed','Filled'],
        default:"Opened"
    },
    noOfApplicants:{
           type: Number,
           default:0
    },
    applicantsId:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        default:[]  
    }],
    jobTags:[
        
       String
    ],
    interactions:{
      type : Number,
      default: 0
    },
    createdAt:{
        type:Date,
        default:Date.now()
    }

})

const JobModel = mongoose.model("JOb",jobSchema)
jobSchema.index({title:1})
jobSchema.index({employerId:1})
jobSchema.index({ description:1, category:1, location:1})
module.exports ={JobModel}