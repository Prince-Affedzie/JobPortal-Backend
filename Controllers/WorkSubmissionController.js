const {WorkSubmissionModel} = require('../Models/WorkSubmissionModel')
const {UserModel} = require('../Models/UserModel')
const {MiniTask} = require('../Models/MiniTaskModel')
const  cloudinary =require('../Utils/Cloudinary')
const io = require('../app')
const { uploader } = cloudinary; 
const streamifier = require('streamifier');


let socketIO = null;

// This will be called by server.js to give us access to `io`
function setSocketIO(ioInstance) {
    socketIO = ioInstance;
}


const submitWork = async(req,res)=>{
    try{
        const {taskId} = req.params
        const {id} = req.user
        const user = await UserModel.findById(id)
        const task = await MiniTask.findById(taskId)
        console.log(task)
        console.log(id)
        if(!task || !user || task.assignedTo.toString() !== id){
            return res.status(400).json({message:"Task Not Found"})
        }
        const {message} = req.body

        const submission  = new WorkSubmissionModel({
            taskId :taskId,
            freelancerId:id,
            clientId: task.employer,
            message:message,

        })
        if (req.files && req.files.length > 0) {
        const uploadedFiles = await Promise.all(
         req.files.map((file) =>
        new Promise((resolve, reject) => {
         const stream = uploader.upload_stream(
          {
            folder: 'work-submissions',
            resource_type: 'raw',
            public_id: file.originalname.split('.')[0],
            format: file.originalname.split('.').pop(),
            use_filename: true,
            unique_filename: false,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        streamifier.createReadStream(file.buffer).pipe(stream);
       })
      )
    );

     submission.files = uploadedFiles.map(file => file.secure_url);
   }

    await submission.save()
    res.status(200).json({message:"Submission Sent Successfully"})

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const viewSubmissions = async(req,res)=>{
    try{
        const {taskId} = req.params
        const {id} = req.user
         
        const task = await MiniTask.findById(taskId)
        const submission = await WorkSubmissionModel.find({taskId:task._id}).populate('freelancerId')
        if(!task || task.employer.toString() !== id ){
            return res.status(403).json({message:"You're not allowed to view this submission"})
        }
        if(!submission){
            return res.status(404).json({message:"No submissions Found for this task"})
        }
        res.status(200).json(submission)


    }catch(err){
        console.log(err)
        return res.status(500).json({message: "Internal server Error"})
    }
}

const reviewSubmission = async(req,res)=>{
    try{
        const {submissionId} = req.params
        const {id} = req.user
        const {status,feedback} = req.body
        const submission = await  WorkSubmissionModel.findById(submissionId)
        console.log(submission.clientId.toString())
        console.log(id)
        console.log(submission)
        if(!submission || submission.clientId.toString()!==id ){
            return res.status(403).json({message:"Not authorized to review this submission."})
        }
         submission.status = status || submission.status
         submission.feedback = feedback || submission.feedback

         if(status === "approved"){
            const task = await MiniTask.findById(submission.taskId)
            task.status = "Completed"
            await task.save()
         }
         await submission.save()
         res.status(200).json({message:"Submission Reviewed Successfully"})

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}


const getMySubmissions = async(req,res)=>{
    try{
        const {id} =req.user
        const  {taskId} = req.params
        const submission = await  WorkSubmissionModel.find(
            {
                freelancerId:id,
                taskId:taskId
            }
        ).populate("taskId")
        if(!submission){
            return res.status(404).json({message:'No Submission Found'})
        }
        res.status(200).json(submission)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}
const freelancerDeleteSubmission =async(req,res)=>{
    try{
        const {submissionId} = req.params
        const submission = await  WorkSubmissionModel.findById(submissionId)
        if(!submission || submission.status === 'approved'){
            return res.status(404).json({message:"Can't remove this submission"})
        }
        await submission.deleteOne()
        res.status(200).json({message:"Submission Removed Successfully"})

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal server Error"})
    }
}


module.exports = {submitWork,viewSubmissions,reviewSubmission,getMySubmissions,freelancerDeleteSubmission,setSocketIO}