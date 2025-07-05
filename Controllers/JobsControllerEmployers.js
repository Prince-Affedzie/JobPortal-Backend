const { ApplicationModel } = require("../Models/ApplicationModel")
const {JobModel} = require("../Models/JobsModel")
const {NotificationModel} = require("../Models/NotificationModel")
const { UserModel } = require("../Models/UserModel")
const EmployerProfile = require( "../Models/EmployerProfile")
const {Interview} = require('../Models/InterviewModel')
const {sendInterviewInviteEmail} = require('../Utils/NodemailerConfig')
const  cloudinary =require('../Utils/Cloudinary')
const { uploader } = cloudinary; 
const streamifier = require('streamifier');


let socketIo =null

function setSocketInstance(ioInstance){
    socketIo = ioInstance
}


const employerSignUp =async(req,res)=>{
    const {id} = req.user
    try{

        console.log(req.body)
        const {companyName, companyEmail,companyLine,personalLine,companyLocation, companyWebsite,} = req.body
        const user = await UserModel.findById(id)
        if(!user){
            return res.status(400).json({message: "No User found"})
        }
        const profile = new EmployerProfile({
            userId : user._id,
            companyName,
            companyEmail,
            companyLine,
            companyLocation,
            companyWebsite,
            postedJobs:[]
           
            
        })
        if(req.file){
                     const uploadedbusinessdocs = await new Promise((resolve, reject) => {
                        const stream = uploader.upload_stream(
                        {
                             folder: 'business docs',
                             resource_type: 'raw',
                             public_id: req.file.originalname.split('.')[0], // removes extension
                             format: req.file.originalname.split('.').pop(), // adds extension
                             use_filename: true,
                             unique_filename: false,
                            },
                             (error, result) => {
                            if (error) reject(error);
                             else resolve(result);
                             }
                             );
                                
                             streamifier.createReadStream(req.file.buffer).pipe(stream);
                             });
                                
                                      
                             profile.businessDocs = uploadedbusinessdocs.secure_url;
        }
        user.phone = personalLine
        await user.save()
        await profile.save()
        res.status(200).json({message: 'Employer Profile Successfully Created'})

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server error"})
    }
}

const addJob = async(req,res)=>{

    try{
       
        const {id} = req.user
        const {title,description,category,jobType,industry,deliveryMode,company, companyEmail,
            location,paymentStyle, salary,skillsRequired,experienceLevel,responsibilities, deadLine,tags} = req.body
            console.log(req.body)

        const employerprofile = await EmployerProfile.findOne({userId:id})
       
        if(!employerprofile){
           return res.status(400).json({message:"Employer Profile not Found"})
        }
        

        const job = new JobModel({
            title:title,
            description: description,
            category:category,
            jobType:jobType,
            industry:industry,
            deliveryMode:deliveryMode,
            location:location,
            paymentStyle:paymentStyle,
            salary:salary,
            skillsRequired:skillsRequired,
            experienceLevel:experienceLevel,
            responsibilities:responsibilities,
            deadLine:deadLine,
            employerId:id,
            employerProfileId:employerprofile._id,
            company:company,
            companyEmail:companyEmail,
            jobTags:tags
        })
        employerprofile.postedJobs.push(job._id)
        await job.save()
        await employerprofile.save()
        res.status(200).json({message:"Job Added Successfully"})

    }catch(err){
        console.log(err)
        return res.status(500).json({message:"Internal Server Error"})
    }

}

const editJob = async(req,res)=>{
    try{
        const {Id} = req.params
        const update = req.body
        const job = await JobModel.findById(Id)
        if(!job){
            return res.status(404).json({message:"Job not Found"})
        }
        Object.assign(job,update)
        await job.save()
        res.status(200).json({message:"Job Update Successful"})


    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const deleteJob = async(req,res)=>{
    try{
        const {Id} =req.params
        const job = await JobModel.findById(Id)
        if(!job){
            return res.staus(404).json({message:"Job not Found"})
        }
        await job.deleteOne()
        res.status(200).json({message:"Job Deleted Successfully"})

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const modifyJobStatus =async(req,res)=>{
    try{
        const {Id} = req.params
        const {state} = req.body
        console.log({state})
        const job = await JobModel.findById(Id)
        if(!job){
            return res.status(404).json({message:"Job not Found"})
        }
        job.status = state
        job.save()
        return res.status(200).json({message:"Job status changed successfully"})

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server error"})
    }
}

const getAllPostedJobs =async(req,res)=>{
    try{
        const {id} =req.user
        const jobs = await JobModel.find({employerId:id}).populate("applicantsId").sort({createdAt:-1})
        res.status(200).json(jobs)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const viewJob = async(req,res)=>{
    try{
        const {Id} = req.params
        console.log(Id)
        const job = await JobModel.findById(Id)
        if(!job){
            return res.status(404).json({message:"Job not Found"})
        }
        res.status(200).json(job)


    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}


const jobSearch = async(req,res)=>{
    try{
        const {term} = req.query
        const jobs = await JobModel.find({

            $or:[
                {title:{$regex:term, $options:'i'}},
                {description:{$regex:term,$options:'i'}}
            ]

            
        })
        res.status(200).json(jobs)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}


const jobSearchFilter = async(req,res)=>{
    try{
        const {term} = req.query
        if(!term){
            return res.status(400).json({message:"Search term Can't be empty"})
        }

        const jobs = await JobModel.find({
            $or:[
                {category:{$regex:term,$options:"i"}},
                { jobType:{$regex:term,$options:'i'}}
            ]
        })
        res.status(200).json(jobs)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const viewAllApplications = async(req,res)=>{
    try{
        const {id} =req.user
        const applications = await ApplicationModel.find({reviewer:id}).populate("user")
        .populate("job").sort({createdAt:-1})
        res.status(200).json(applications)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}
const viewJobApplications = async(req,res)=>{
    try{
        const {Id} = req.params

        const applications = await ApplicationModel.find({job:Id}).populate({
           path: 'user',
           select: 'name email phone education skills workExperience profileImage location ' 
       })
      .populate({
        path :'job',
        select:'title noOfApplicants status salary createdAt deliveryMode'
        }).sort({createdAt:-1}).exec()

       
        res.status(200).json(applications)


    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const viewSingleApplication = async(req,res)=>{
    try{
         const {Id} = req.params
         const application = await ApplicationModel.findById(Id).populate("users","name","email","skills","education")
         if(!application){
            return res.status(404).json({message:"Application not Found"})
         }
         res.status(application)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const modifyApplication =async(req,res)=>{

 let notification = null 

    try{
       
        const { applicants,status} = req.body
        const userIds = applicants.map(app => app.userId);
        const applicationIds = applicants.map(app => app.applicationId);
       

        if (! applicationIds || !Array.isArray( applicationIds) || applicationIds.length === 0) {
            return res.status(400).json({ message: "Invalid or empty 'Ids' array provided." });
        }
        if (!status) {
            return res.status(400).json({ message: "'status' is required." });
        }
       
         await ApplicationModel.updateMany({_id: {$in:  applicationIds}},{$set :{status:status}})
         const application = await ApplicationModel.findOne({ _id:  applicationIds[0] })
        .populate({
            path: 'job',
            select: 'title'
        }).lean();

        if (!application || !application.job) {
            console.warn("Could not retrieve sample application or job details for notifications.");
            return res.status(200).json({ message: "Applications modified successfully, but failed to generate notifications." });
        }
        const jobTitle = application.job.title
         const notificationsToCreate = userIds.map(id => ({
            user: id, 
            message: `Hi, your application status for this job "${jobTitle}" has been updated. Current Status: ${status}. Please contact the employer for any queries.`,
            title: "Application Short Listing"
        }));

        const createdNotifications = await NotificationModel.insertMany(notificationsToCreate);
        console.log(`Created ${createdNotifications.length} notifications.`);

         if (socketIo) {
            for (const notification of createdNotifications) {
                // Ensure notification.user is a string for socket.io room
                socketIo.to(notification.user.toString()).emit('notification', notification);
                console.log(`Emitted notification to user: ${notification.user}`);
            }
        } else {
            console.warn("SocketIO is not initialized! Notifications will not be real-time.");
        }
        res.status(200).json({message:"Application Modified Successfully and notification sent."})

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const interviewController = async(req,res)=>{
    let notification
    try{
        const {Id} = req.params
        const {interviewState} = req.body
       
        const application = await ApplicationModel.findById(Id).populate({
            path:"job",
            select:'title'
        })
       
        if(!application){
            return res.status(400).json({message:"Application not found"})
        }
        application.inviteForInterview = interviewState
         if(interviewState === true){
             notification = new NotificationModel({
                user:application.user,
                message:`Congratulations! You've been invited to an Interview For this Job: "${application.job.title}". Please contact the employer for more details.`,
                title:"Invite For An Interview"
            })
         }else{
             notification = new NotificationModel({
                user:application.user,
                message:`Sorry! Your Interview Invitation For this Job: "${application.job.title}" has been Canceled. Please contact the employer for more details.`,
                title:"Interview Invitation Cancellation"
            })
         }
        
        
        if(socketIo){
            
            socketIo.to(application.user.toString()).emit('notification',notification)
        }else {
            console.warn("SocketIO is not initialized!");
        }

        await application.save()
        await notification.save()
       
        res.status(200).json({message:"Applicants Invited for Interview"})

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }

}

const createInterviewInvite = async(req,res)=>{
    try{
        const {id} = req.user
        
        const {invitationsTo,applications,interviewDate,interviewTime,location,jobId} = req.body
        const employer = await EmployerProfile.findOne({userId:id})
        const job  = await JobModel.findById(jobId)
        if(!employer || !job){
            return res.status(400).json({message:"Employer Profile or Job Not Found"})
        }
        let invitedApplicants = await Promise.all(
            invitationsTo.map((id)=>UserModel.findById(id))
        )
       
       
        
        let invitedApplicantsEmail = invitedApplicants
            .filter(app =>app && app.email)
            .map(app=>app.email)
        
        const interview = new Interview({
            invitedBy : employer._id,
            invitationsTo:invitationsTo,
            interviewDate: interviewDate,
            interviewTime:interviewTime,
            location:location,
            job :jobId
        })
       
        await interview.save()
        if(invitedApplicantsEmail.length === 0){
            return res.status(400).json({message:"Applicants List can't be empty"})
        }
        let message = `
           Dear Applicant,

            Congratulations! ${employer.companyName} has invited you to an interview for the position of "${job.title}" that you applied for.

            Please find the interview details below:

             -Date: ${new Date(interview.interviewDate).toDateString()}
             -Time: ${interview.interviewTime}
             -Location: ${interview.location}

             We wish you the very best in your interview.

            Kind regards,  
            ${employer.companyName} Recruitment Team
           `;
        
        sendInterviewInviteEmail(employer,invitedApplicantsEmail,message)
        await ApplicationModel.updateMany({_id: {$in:  applications}},{$set :{status:"Interviewing"}})


        for await (const app of  invitedApplicants) {
            notification = new NotificationModel({
                user:app._id,
                message:`Congratulations! You've been invited to an Interview For this Job: "${job.title}". Please check  your email for more details or contact the employer.`,
                title:"Invite For An Interview"
            })

            if(socketIo){
            
                socketIo.to(app._id.toString()).emit('notification',notification)
            }else {
                console.warn("SocketIO is not initialized!");
            }

            await notification.save()
    
        }
        res.status(200).json({message:'Invitation Message sent'})
        


    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}
const getEmployerProfile = async(req,res)=>{
    try{
        const {id} = req.user
       
        const employerprofile = await EmployerProfile.findOne({userId:id}).populate('userId')
        if(!employerprofile){
            return res.status(400).json({message:"Account not Found"})
        }
        console.log("I'm sending",employerprofile )
        res.status(200).json(employerprofile)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server  Error"})
    }
}







module.exports = {addJob,editJob,deleteJob,modifyApplication,viewSingleApplication,viewJob,
    getAllPostedJobs,viewJobApplications,jobSearch,jobSearchFilter,viewAllApplications,modifyJobStatus,
    interviewController,setSocketInstance,employerSignUp,createInterviewInvite,getEmployerProfile}