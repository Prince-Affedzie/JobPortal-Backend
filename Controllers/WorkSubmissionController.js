const {WorkSubmissionModel} = require('../Models/WorkSubmissionModel')
const {UserModel} = require('../Models/UserModel')
const {MiniTask} = require('../Models/MiniTaskModel')
const  cloudinary =require('../Config/Cloudinary')
const io = require('../app')
const { uploader } = cloudinary; 
const {processEvent} = require('../Services/adminEventService')
const streamifier = require('streamifier');
const { getUploadURL, getPreviewURL } = require('../Services/aws_S3_file_Handling');


let socketIO = null;

// This will be called by server.js to give us access to `io`
function setSocketIO(ioInstance) {
    socketIO = ioInstance;
}

const generateUploadURL = async (req, res) => {
  try {
    const { taskId, filename, contentType } = req.body;
    const {id} = req.user
    const fileKey = `submissions/${taskId}/${id}/${Date.now()}-${filename}`;

    const uploadURL = await getUploadURL(fileKey,contentType);
    console.log(uploadURL, fileKey)
    res.status(200).json({ uploadURL, fileKey });
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Failed to generate upload URL', details: err });
  }
};


const generatePreviewURL = async (req, res) => {
  try {
     
    const { fileKey,selectedSubmission } = req.query;
    
    let previewURL
    if(selectedSubmission && selectedSubmission === 'approved'){
           previewURL = await getPreviewURL(fileKey,allowDownload=true);
    }else{
         previewURL = await getPreviewURL(fileKey,allowDownload=false);
    }
   
    
    res.status(200).json({ previewURL });
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Failed to generate preview URL', details: err });
  }
};


const submitWork = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { id } = req.user;
    const user = await UserModel.findById(id);
    const task = await MiniTask.findById(taskId);

    if (!task || !user || task.assignedTo.toString() !== id) {
      return res.status(400).json({ message: "Task Not Found or Unauthorized" });
    }
    
    const { message, fileKeys } = req.body; // fileKeys = array of S3 keys like ['submissions/task123/user456/file.pdf']

    const submission = new WorkSubmissionModel({
      taskId,
      freelancerId: id,
      clientId: task.employer,
      message,
      files: fileKeys || [], // Save the keys
    });

    await submission.save();
    res.status(200).json({ message: "Submission Sent Successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


const viewSubmissions = async(req,res)=>{
    try{
        const {taskId} = req.params
        const {id} = req.user
         
        const task = await MiniTask.findById(taskId)
        const submission = await WorkSubmissionModel.find({taskId:task._id}).populate('freelancerId').populate('taskId')
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
       
        if(!submission || submission.clientId.toString()!==id ){
            return res.status(403).json({message:"Not authorized to review this submission."})
        }
         submission.status = status || submission.status
         submission.feedback = feedback || submission.feedback
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


module.exports = {submitWork,viewSubmissions,reviewSubmission,getMySubmissions,
    freelancerDeleteSubmission,setSocketIO,generateUploadURL,generatePreviewURL}