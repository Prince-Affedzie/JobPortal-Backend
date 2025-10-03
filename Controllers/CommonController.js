const {JobModel} = require('../Models/JobsModel')
const {ApplicationModel} = require("../Models/ApplicationModel")
const {MiniTask} =require("../Models/MiniTaskModel")
const { UserModel } = require('../Models/UserModel')
const {NotificationModel} = require('../Models/NotificationModel')
const  cloudinary =require('../Config/Cloudinary')
const io = require('../app')
const { uploader } = cloudinary; 
const streamifier = require('streamifier');
const ConversationRoom = require('../Models/ConversationRoom');
const { getUploadURL, getPreviewURL, getPublicURL } = require('../Services/aws_S3_file_Handling')
const {processEvent} = require('../Services/adminEventService')
const  {matchApplicantsWithPipeline} = require('../Services/MicroJob_Applicants_Sorting')

//const client = require('../Utils/redisClient')



let socketIO = null;

// This will be called by server.js to give us access to `io`
function setSocketIO(ioInstance) {
    socketIO = ioInstance;
}

const allJobs = async(req,res)=>{
    try{
        let query = {status:"Opened"}
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
    
      const resume = req.file?req.file.filename: ''
     
    try{

        const job = await JobModel.findById(Id)
        const notificationService = req.app.get('notificationService');


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

       await notificationService.sendJobApplicationNotification({
        employerId: job.employerId,
        jobTitle: job.title
        });
        await application.save()
        await job.save()
        
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
        const { title, description, budget,biddingType, deadline, locationType,address,category,subcategory,skillsRequired} = req.body;
        
        if (!title || !description || !budget || !deadline || !locationType) {
            return res.status(400).json({ error: "All required fields must be provided" });
        }

        const newTask = new MiniTask({
            title,
            description,
            employer:id,
            biddingType,
            budget,
            deadline,
            address,
            locationType,
            category,
            subcategory,
            skillsRequired,
            
        });
        await newTask.save()
        processEvent("NEW_MICRO_JOB_POSTING",newTask);
        return res.status(200).json({message:"Task Created Successfully"})


    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal server Error"})
    }
}

const getBids = async (req, res) => {
  const { Id } = req.params;

  try {
    const minitask = await MiniTask.findById(Id).populate("bids.bidder");

    if (!minitask) {
      return res.status(404).json({ message: "Task Not Found" });
    }

    // Extract bids
    const Bids = minitask.bids.map((bid) => ({
      _id: bid._id,
      amount: bid.amount,
      message: bid.message,
      timeline:bid.timeline,
      createdAt: bid.createdAt,
      bidder: {
        _id: bid.bidder?._id,
        name: bid.bidder?.name,
        phone: bid.bidder?.phone,
        profileImage: bid.bidder?.profileImage,
        skills:bid.bidder?.skills,
        education:bid.bidder?.education,
        workExperience: bid.bidder?.workExperience,
        workPortfolio:bid.bidder?.workPortfolio,
        Bio: bid.bidder?.Bio,
        location:bid.bidder?.location,
        isVerified: bid.bidder?.isVerified,
        vettingStatus: bid.bidder?.vettingStatus,
        rating:bid.bidder?.rating,
        numberOfRatings:bid.bidder?.numberOfRatings,
        ratingsReceived:bid.bidder?.ratingsReceived,
       
      },
    }));

    return res.status(200).json(Bids);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const acceptBid = async (req, res) => {
  try {
    const { taskId, bidId } = req.params;
    const { id } = req.user; // employer

    const miniTask = await MiniTask.findById(taskId);
    if (!miniTask) return res.status(404).json({ message: "Task not found" });

     if(miniTask.status === "In-progress" || miniTask.status === "Completed"){
            return res.status(400).json({message:"Can not re-assign Task."})
        }

    if (miniTask.employer.toString() !== id) {
      return res.status(403).json({ message: "Not authorized to accept bids on this task" });
    }

    const bid = miniTask.bids.id(bidId);
    if (!bid) return res.status(404).json({ message: "Bid not found" });

    // Update task assignment
    miniTask.assignedTo = bid.bidder;
    miniTask.status = "Assigned";
    bid.status = "Accepted";

    // Reject other bids
    miniTask.bids.forEach(b => {
      if (b._id.toString() !== bidId) b.status = "Rejected";
    });

     let room = await ConversationRoom.findOne({
              participants: { $all: [id, bid.bidder], $size: 2 },
               job: miniTask._id || null
             
            }).populate('participants');
        
            if (!room) {
              room = await ConversationRoom.create({
                participants: [id,bid.bidder],
                job:  miniTask._id  || null,
              });
            }


    await miniTask.save();
    await room.save();

    const notificationService = req.app.get("notificationService");
    await notificationService.sendBidAcceptedNotification({
      freelancerId: bid.bidder,
      jobTitle: miniTask.title,
    });

    res.status(200).json({ message: "Bid accepted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


const assignMiniTask =async(req,res)=>{
    try{
        const {id} = req.user
        const {taskId,applicantId} =req.params
        const miniTask = await MiniTask.findById(taskId)
        const notificationService = req.app.get('notificationService');

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


        await notificationService.sendMicroJobAssignmentNotification({
        freelancerId: applicantId,
        jobTitle: miniTask.title})

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
        let query ={status:'Open'}
        
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
        
        const miniTasks = await MiniTask.find(query).sort({createdAt:-1}).populate("employer","name phone isVerified")
        res.status(200).json(miniTasks)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})

    }
}

const applyOrBidMiniTask = async (req, res) => {
  try {
    const { id } = req.user;
    const { Id } = req.params;
    const { amount, message, timeline } = req.body; // bid fields
    const miniTask = await MiniTask.findById(Id).populate("employer _id");
    const user = await UserModel.findById(id);

    if (!miniTask || !user) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (user._id.toString() === miniTask.employer._id.toString()) {
      return res.status(400).json({ message: "You cannot apply/bid on your own task" });
    }

    // Case 1: open-bid → place a bid
    if (miniTask.biddingType === "open-bid") {
      const existingBid = miniTask.bids.find((b) => b.bidder.toString() === id);
      if (existingBid) {
        return res.status(400).json({ message: "You have already placed a bid on this task" });
      }

      miniTask.bids.push({ bidder: id, amount, message, timeline });
      if (!miniTask.applicants.includes(id)) {
        miniTask.applicants.push(id);
        user.appliedMiniTasks.push(miniTask._id);
      }

      await miniTask.save();
      await user.save();

      const notificationService = req.app.get("notificationService");
      await notificationService.sendBidNotification({
        clientId: miniTask.employer._id,
        jobTitle: miniTask.title,
      });

      return res.status(200).json({ message: "Bid placed successfully" });
    }

    // Case 2: fixed → normal application
    if (miniTask.biddingType === "fixed") {
      if (miniTask.applicants.includes(id)) {
        return res.status(400).json({ message: "You have already applied to this task" });
      }

      miniTask.applicants.push(id);
      user.appliedMiniTasks.push(miniTask._id);

      await miniTask.save();
      await user.save();

      const notificationService = req.app.get("notificationService");
      await notificationService.sendMicroJobApplicationNotification({
        clientId: miniTask.employer._id,
        jobTitle: miniTask.title,
      });

      return res.status(200).json({ message: "Application submitted successfully" });
    }

    return res.status(400).json({ message: "Invalid task type" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



const acceptMiniTaskAssignment = async(req,res)=>{
    try{
        const {Id} = req.params
        const {id} = req.user
        const user = await UserModel.findById(id)
        const task = await MiniTask.findById(Id)
        const notificationService = req.app.get('notificationService');

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

         await notificationService.sendMicroJobAcceptanceNotification({
         username:user.name,
         clientId:  task.employer._id,
         jobTitle: task.title})

         await  room.save()
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
        const notificationService = req.app.get('notificationService');

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
        
        

        await notificationService.ssendMicroJobAcceptanceNotification({
        username:user.name,
        clientId:  task.employer._id,
        jobTitle: task.title})

         await  room.deleteOne()
         
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

const getMyCreatedMiniTasks = async(req,res)=>{
    try{
        const {id} =req.user
        const minitasks = await MiniTask.find({employer:id}).populate("applicants").sort({createdAt:-1})
        .populate("assignedTo")
        res.status(200).json(minitasks)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const getMicroTaskApplicants = async(req,res)=>{
    try{
        const {id} =req.user
        const {Id} = req.params
        const { sortBy = "totalScore", order = "desc" } = req.query;
        //const minitask = await MiniTask.findById(Id).populate("applicants").sort({createdAt:-1})
        //.populate("assignedTo")
        const applicants = await matchApplicantsWithPipeline(Id, sortBy, order);
       
        res.status(200).json(applicants)

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
       
        const task = await MiniTask.findById(Id)
        if(!task || task.assignedTo !==null ||task.status === "In-progress"){
            return res.status(400).json({message:"Task not found or This task is not allowed for deletion"})
        }
        await task.deleteOne()
        res.status(200).json({message:"Task Deleted Successfully"})

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const yourAppliedMiniTasks = async (req, res) => {
    try {
        const { id } = req.user;
        
        // Populate user with applied mini tasks and additional bid information
        const user = await UserModel.findById(id).populate({
            path: 'appliedMiniTasks',
            populate: [
                {
                    path: 'employer',
                    select: 'name phone profileImage'
                },
                {
                    path: 'bids.bidder',
                    select: 'name'
                }
            ]
        });

        const applications = [];
        const bids = [];

        user.appliedMiniTasks.forEach(task => {
            // Check if task is still open or assigned to this user
            const isActiveTask = task.status === 'Open' || 
                               (task.assignedTo && task.assignedTo.toString() === id.toString());
            
            if (!isActiveTask) return;

            // Find user's bid if it exists
            const userBid = task.bids.find(bid => bid.bidder._id.toString() === id.toString());

            if (task.biddingType === "open-bid") {
                // For open-bid tasks, include bid information
                if (userBid) {
                    bids.push({
                        task: {
                            _id: task._id,
                            title: task.title,
                            description: task.description,
                            employer: task.employer,
                            biddingType: task.biddingType,
                            budget: task.budget,
                            deadline: task.deadline,
                            locationType: task.locationType,
                            category: task.category,
                            status: task.status,
                            assignedTo:task.assignedTo,
                            assignmentAccepted:task.assignmentAccepted,
                            createdAt: task.createdAt
                        },
                        bid: {
                            amount: userBid.amount,
                            message: userBid.message,
                            timeline: userBid.timeline,
                            status: userBid.status,
                            createdAt: userBid.createdAt
                        }
                    });
                }
            } else if (task.biddingType === "fixed") {
                // For fixed-price tasks, include as application
                applications.push({
                    _id: task._id,
                    title: task.title,
                    description: task.description,
                    employer: task.employer,
                    biddingType: task.biddingType,
                    budget: task.budget,
                    deadline: task.deadline,
                    locationType: task.locationType,
                    category: task.category,
                    status: task.status,
                    assignedTo:task.assignedTo,
                    assignmentAccepted:task.assignmentAccepted,
                    appliedAt: task.createdAt // Using task creation date as applied date
                });
            }
        });

        // Sort both arrays by creation date (newest first)
        applications.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
        bids.sort((a, b) => new Date(b.bid.createdAt) - new Date(a.bid.createdAt));
       
        res.status(200).json({
            applications,
            bids
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

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
        const task = await MiniTask.findById(Id).populate('employer','name phone profileImage isVerified email rating numberOfRatings')
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
    jobSearchFilter,allJobs,postMiniTask,assignMiniTask,getMiniTasks, applyOrBidMiniTask ,getBids,acceptBid,removeAppliedMiniTasksFromDashboard,
    getRecentJobApplications,getMyCreatedMiniTasks,editMiniTask,deleteMiniTask,yourAppliedMiniTasks,setSocketIO,viewMiniTaskInfo,getMicroTaskApplicants}