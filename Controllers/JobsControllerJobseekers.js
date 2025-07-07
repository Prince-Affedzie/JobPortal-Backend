const {JobModel} = require('../Models/JobsModel')
const {ApplicationModel} = require("../Models/ApplicationModel")
const {MiniTask} =require("../Models/MiniTaskModel")
const { UserModel } = require('../Models/UserModel')
const {NotificationModel} = require('../Models/NotificationModel')
const  cloudinary =require('../Utils/Cloudinary')
const io = require('../app')
const { uploader } = cloudinary; 
const streamifier = require('streamifier');
const ConversationRoom = require('../Models/ConversationRoom');
const { getUploadURL, getPreviewURL, getPublicURL } = require('../Utils/s3')
//const client = require('../Utils/redisClient')



let socketIO = null;

// This will be called by server.js to give us access to `io`
function setSocketIO(ioInstance) {
    socketIO = ioInstance;
}

const allJobs = async(req,res)=>{
    try{
        let query = {}
        const {category,search,type,location} = req.query

        if(search){
            query.$or = [
                {title:{$regex:search,$options:'i'}},
                {description:{$regex:search,$options:'i'}}
            ]
        }
        if(category && category !=="All Categories"){
           query.category =category
        }
        if(location && location !=="All Regions"){
            query["location.region"] = location
        }
        if(type && type!== "All Types"){
            query.jobType = type
        }
       
       
        const jobs = await JobModel.find(query).sort({createdAt:-1})
        
        res.status(200).json(jobs)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const viewJob = async(req,res)=>{
    try{
        const {Id} =req.params
        const job = await JobModel.findById(Id)
        if(!job){
            return res.status(404).json({message:"Job not Found"})
        }
        job.interactions = job.interactions + 1
        await job.save()
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

const applyToJob = async(req,res)=>{
      const {id} = req.user
      const{Id} = req.params
      const {coverLetter} = req.body
      console.log("Body ",req.body)
      console.log("file ",req.file)
      const resume = req.file?req.file.filename: ''
      console.log(req.body)
      console.log(resume)
    try{

        const job = await JobModel.findById(Id)

        if (!job || job.status === "Closed"){
            return res.status(400).json({message:"Application Closed For this Job"})
        }

        const hasAlreadyApplied = job.applicantsId.some(Id=>{
            return Id.equals(id)
        })
        
        if(hasAlreadyApplied){
            return res.status(400).json({message:"You have already Applied to this job"})
        }

        const application = new ApplicationModel({
            user:id,
            job:Id,
            coverLetter:coverLetter,
            reviewer:job.employerId
         })

         let uploadUrl
         if (req.file) {
                   const filename  = req.file.originalname
                   const contentType  = req.file.minetype
                   const fileKey = `resumes/${id}/${Date.now()}-${filename}`;
                   uploadUrl = await getUploadURL(fileKey,contentType)
                   const publicUrl = getPublicURL(fileKey);
                   application.resume = publicUrl;
                 
                }
         await UserModel.findOneAndUpdate(
            {'_id':id},
            { $push: { appliedJobs: Id } }, 
            { new: true } 
        )
        
        
        job.noOfApplicants = job.noOfApplicants + 1
        job.applicantsId.push(id)

        const notification = new NotificationModel({
            user:job.employerId,
            message:` New Pending Application Received for your job posting "${job.title}".`,
            title:"New Job Application"

        })
        if (socketIO) {
            socketIO.to(job.employerId.toString()).emit('notification', notification);
            console.log(`Notification sent to ${job.employerId}`);
        } else {
            console.warn("SocketIO is not initialized!");
        }
        await application.save()
        await job.save()
        await notification.save()
        res.status(200).json({uploadUrl:uploadUrl})
             
      
    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const viewAllApplications = async(req,res)=>{
    try{
         const {id} = req.user
         const jobsApplied = await ApplicationModel.find({user:id}).populate('job').sort({createdAt:-1}).exec()
         res.status(200).json(jobsApplied)   
    }
    catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})    
    }
}

const viewApplication = async(req,res)=>{
    try{
         const {Id} = req.params
         const application = await ApplicationModel.findById(Id)
         if(!application){
            return res.status(404).json({message:"Application not found"})
         }
         res.status(200).json(application)
    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}


const postMiniTask = async(req,res)=>{
    try{
        const {id} =req.user
        const { title, description, budget, deadline, locationType,address,category,subcategory,skillsRequired} = req.body;
        
        if (!title || !description || !budget || !deadline || !locationType) {
            return res.status(400).json({ error: "All required fields must be provided" });
        }

        const newTask = new MiniTask({
            title,
            description,
            employer:id,
            budget,
            deadline,
            address,
            locationType,
            category,
            subcategory,
            skillsRequired,
            
        });
        await newTask.save()
        return res.status(200).json({message:"Task Created Successfully"})


    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal server Error"})
    }
}

const assignMiniTask =async(req,res)=>{
    try{
        const {id} = req.user
        const {taskId,applicantId} =req.params
        const miniTask = await MiniTask.findById(taskId)
        if(!miniTask || miniTask.status === "In-progress" || miniTask.status === "Completed"){
            return res.status(404).json({message:"Can not assign Task."})
        }
        miniTask.assignedTo = applicantId
        miniTask.status = "Assigned"

         let room = await ConversationRoom.findOne({
              participants: { $all: [id, applicantId], $size: 2 },
               job: miniTask._id || null
             
            }).populate('participants');
        
            if (!room) {
              room = await ConversationRoom.create({
                participants: [id,applicantId],
                job:  miniTask._id  || null,
              });
            }


        const notification = new NotificationModel({
            user:applicantId,
            message:`Congratulations! You've been assigned to the mini task: "${miniTask.title}". Please contact employer for more details.`,
            title:"Mini Task Assignment"

        })
        if (socketIO) {
            socketIO.to(applicantId.toString()).emit('notification', notification);
            console.log(`Notification sent to ${applicantId}`);
        } else {
            console.warn("SocketIO is not initialized!");
        }
        await notification.save()
        await miniTask.save()
        await room.save()
        res.status(200).json({message:"Task Assigned Successfully"})
    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const getMiniTasks = async(req,res)=>{
    try{
        let query ={}
        
        const {search,category,subcategory,location, modeofDelivery} = req.query
        if(category && category !== "All Categories"){
            query.category = category
        }
        if(subcategory && subcategory !== "All Subcategories"){
            query.subcategory = subcategory
        }

        if(location && location !== "All Regions"){
            query['address.region'] = location
        }
        if( modeofDelivery && modeofDelivery !=="All Modes"){
            query.locationType =  modeofDelivery
        }
        
        if(search){

            query.$or =[
                {title:{$regex:search,$options:'i'}},
                {description:{$regex:search,$options:'i'}}
            ]

        }
        console.log(query)
        const miniTasks = await MiniTask.find(query).sort({createdAt:-1}).populate("employer","name phone isVerified")
        res.status(200).json(miniTasks)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})

    }
}

const applyToMiniTask = async(req,res)=>{
    try{
        const {id} =req.user
        const {Id} =req.params
        const miniTask = await MiniTask.findById(Id).populate('employer _id')
        const user = await UserModel.findById(id)
        if(!miniTask || !user){
            return res.status(404).json({message:"Job not Found"})
        }
        if(!miniTask.applicants.includes(id)){
        
        
        miniTask.applicants.push(id)
        user.appliedMiniTasks.push(miniTask._id)
        await miniTask.save()
        await user.save()
         const notification  = new NotificationModel({
         user: miniTask.employer._id,
         title:"Mini Task Application",
         message: `You've gotten a new Application for your MiniTask with the title: ${miniTask.title} `
         })

         await notification.save()

         if(socketIO){
                console.log(miniTask.employer._id)
                socketIO.to(miniTask.employer._id).emit('notification',notification)
                console.log(`Notification sent to ${miniTask.employer._id}`);
                console.log(`Notification sent to ${notification}`);
            }else {
            console.warn("SocketIO is not initialized!");
        }

            return res.status(200).json({message:"Application Successful"})
        }else{
            return res.status(400).json({message:"You've Already Applied to this Task"})
        }


    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const acceptMiniTaskAssignment = async(req,res)=>{
    try{
        const {Id} = req.params
        const {id} = req.user
        const user = await UserModel.findById(id)
        const task = await MiniTask.findById(Id)
        if(!task || ! user){
             return res.status(400).json({message:"Task not Found."})
        }
        
        if(id !== task.assignedTo.toString()){
            return res.status(400).json({message:"Task Hasn't been assigned to you yet"})
        }
        task.assignmentAccepted = true
        task.status = "In-progress"
        await task.save()
        

        let room = await ConversationRoom.findOne({
              participants: { $all: [id, task.employer], $size: 2 },
               job: task._id || null
             
            }).populate('participants');
        
            if (!room) {
              room = await ConversationRoom.create({
                participants: [id, task.employer],
                job: task._id  || null,
              });
            }

         const notification  = new NotificationModel({
         user: task.employer._id,
         title:"Mini Task Acceptance",
         message: `${user.name} has accepted the Mini Task you assigned to `
         })

         await notification.save()
         await  room.save()
         

         if(socketIO){
               
                socketIO.to(task.employer._id.toString()).emit('notification',notification)
                console.log(`Notification sent to ${task.employer._id}`);
               
            }else {
            console.warn("SocketIO is not initialized!");
        }

        res.status(200).json({message:'Task Accepted Successfully'})

    }catch(err){
        console.log(err)
        res.status(500).json({message:'Internal Server Error'})
    }
}


const rejectMiniTaskAssignment = async(req,res)=>{
    try{
        const {Id} = req.params
        const {id} = req.user
        const user = await UserModel.findById(id)
        const task = await MiniTask.findById(Id)
        if(!task || ! user){
             return res.status(400).json({message:"Task not Found."})
        }
        
        if(id !== task.assignedTo.toString()){
            return res.status(400).json({message:"Task Hasn't been assigned to you yet"})
        }
        task.assignedTo = null
        task.status = "Open"
        await task.save()
        

        let room = await ConversationRoom.findOne({
              participants: { $all: [id, task.employer], $size: 2 },
               job: task._id || null
             
            }).populate('participants');
        
        

         const notification  = new NotificationModel({
         user: task.employer._id,
         title:"Mini Task Rejection",
         message: `${user.name} has rejected the Mini Task you assigned to `
         })

         await notification.save()
         await  room.deleteOne()
         

         if(socketIO){
               
                socketIO.to(task.employer._id.toString()).emit('notification',notification)
                console.log(`Notification sent to ${task.employer._id}`);
               
            }else {
            console.warn("SocketIO is not initialized!");
        }

        res.status(200).json({message:'Task Rejected Successfully'})

    }catch(err){
        console.log(err)
        res.status(500).json({message:'Internal Server Error'})
    }
}

const getRecentJobApplications  =async(req,res)=>{
    try{
        const {id} =req.user
        const applications = await ApplicationModel.find({user:id}).populate('job','title company companyEmail status description')
        .populate({ path:'reviewer' , select:'phone name email'})
        .sort({createdAt:-1})
        return res.status(200).json(applications)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const getCreatedMiniTasks = async(req,res)=>{
    try{
        const {id} =req.user
        const minitasks = await MiniTask.find({employer:id}).populate("applicants")
        .populate("assignedTo")
        res.status(200).json(minitasks)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const editMiniTask = async (req, res) => {
  try {
    const { Id } = req.params;
    const { body } = req.body;
    const { status } = body;
    const task = await MiniTask.findById(Id);

    if (!task) {
      return res.status(400).json({ message: "No Task Found" });
    }

   
    if (status && status !== task.status) {
     
      if (status === "Closed") {
        const canClose =
          task.status === "Completed" ||
          (task.status === "Open" && (!task.assignedTo || task.assignedTo === null));

        if (!canClose) {
          return res.status(400).json({
            message:
              "You can only close a task that is completed or open without any assigned freelancer.",
          });
        }
        }

      
       else if (status === "Open") {
        if (task.status !== "Closed") {
          return res.status(400).json({
            message: "You can only reopen a task that is currently closed.",
          });
        }
      }

      
      else {
        return res.status(400).json({
          message: "Invalid status transition.",
        });
      }
    }

   
    Object.assign(task, body);
    await task.save();

    return res
      .status(200)
      .json({ message: "Mini Task Updated Successfully", task });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


const deleteMiniTask = async(req,res)=>{
    try{
        const {Id} = req.params
        console.log(Id)
        const task = await MiniTask.findById(Id)
        if(!task){
            return res.status(400).json({message:"Task not found"})
        }
        await task.deleteOne()
        res.status(200).json({message:"Task Deleted Successfully"})

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const yourAppliedMiniTasks = async(req,res)=>{
    try{
        const {id} = req.user
        const user = await UserModel.findById(id).populate({
            path:'appliedMiniTasks',
            populate:{
                path:'employer',
                select:'name phone profileImage'
            }

        })
      
       const userMiniTaskApplications = user.appliedMiniTasks.filter(
        (task)=>task.status === 'Open' || (task.assignedTo && task.assignedTo.toString() === id.toString()))
        res.status(200).json(userMiniTaskApplications.reverse())

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const removeAppliedMiniTasksFromDashboard = async(req,res)=>{
    try{
        const {Ids} = req.body
        const {id} = req.user
        console.log(req.body)
        const user = await UserModel.findById(id)
       user.appliedMiniTasks = user.appliedMiniTasks.filter((taskId)=>!Ids.includes(taskId.toString()))
       await user.save()
       res.status(200).json({message:"Tasks Removed Successfully"})
    }catch(err){
        console.log(err)
        res.status(500).json({message:" Internal Server Error"})
    }
}
const viewMiniTaskInfo = async(req,res)=>{
    try{
        const {Id} = req.params
        const task = await MiniTask.findById(Id).populate('employer','name phone profileImage isVerified')
        if(!task){
            return res.status(400).json({message: 'Task not Found'})
        }
        res.status(200).json(task)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}


module.exports = {viewJob,viewAllApplications,viewApplication,applyToJob,jobSearch,acceptMiniTaskAssignment,rejectMiniTaskAssignment,
    jobSearchFilter,allJobs,postMiniTask,assignMiniTask,getMiniTasks,applyToMiniTask,removeAppliedMiniTasksFromDashboard,
    getRecentJobApplications,getCreatedMiniTasks,editMiniTask,deleteMiniTask,yourAppliedMiniTasks,setSocketIO,viewMiniTaskInfo}