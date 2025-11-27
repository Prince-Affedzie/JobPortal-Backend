const {WorkSubmissionModel} = require('../Models/WorkSubmissionModel')
const {ServiceRequest} = require( "../Models/ServiceRequestModel.js");
const {UserModel} = require('../Models/UserModel')
const {MiniTask} = require('../Models/MiniTaskModel')
const  cloudinary =require('../Config/Cloudinary')
const io = require('../app')
const { uploader } = cloudinary; 
const {processEvent} = require('../Services/adminEventService')
const streamifier = require('streamifier');
const { getUploadURL, getPreviewURL, deleteFromS3,deleteMultipleFromS3, deleteMultipleSubmissionFilesFromS3} = require('../Services/aws_S3_file_Handling');


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
    const { taskId, type } = req.params; 
    const { id } = req.user;
    const notificationService = req.app.get("notificationService");
    const { message, fileKeys } = req.body;

   
    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Step 2: Identify which model to use
    let task;
    let clientId;
    let taskTitle;

    if (type === "miniTask") {
      task = await MiniTask.findById(taskId);
      if (!task) return res.status(404).json({ message: "MiniTask not found" });

      if (task.assignedTo.toString() !== id) {
        return res.status(403).json({ message: "Unauthorized to submit this task" });
      }

      clientId = task.employer;
      taskTitle = task.title;
    } 
    else if (type === "serviceRequest") {
      task = await ServiceRequest.findById(taskId);
      if (!task) return res.status(404).json({ message: "Service Request not found" });

      if (!task.assignedTasker || task.assignedTasker.toString() !== id) {
        return res.status(403).json({ message: "Unauthorized to submit this service request" });
      }

      clientId = task.client;
      taskTitle = task.type || "Service Request";
    } 
    else {
      return res.status(400).json({ message: "Invalid type parameter" });
    }

    // Step 3: Save submission
    const submission = new WorkSubmissionModel({
      taskId,
      taskType: type,
      freelancerId: id,
      clientId,
      message,
      files: fileKeys || [],
    });

    await submission.save();

    // Step 4: Notifications
    await notificationService.sendWorkSubmissionNotification({
      clientId,
      taskTitle,
      freelancerName: user.name,
      submissionId: submission._id,
    });

    await notificationService.sendWorkSubmissionConfirmation({
      freelancerId: user._id,
      taskTitle,
    });

    res.status(200).json({ 
      message: "Submission Sent Successfully", 
      submissionId: submission._id 
    });

  } catch (err) {
    console.error("Error submitting work:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const viewSubmissions = async(req,res)=>{
    try{
        const {taskId} = req.params
        const {id} = req.user
         
        //const task = await MiniTask.findById(taskId)
        const submission = await WorkSubmissionModel.find({taskId:taskId}).populate('freelancerId').populate('taskId')
        /*if(!task || task.employer.toString() !== id ){
            return res.status(403).json({message:"You're not allowed to view this submission"})
        }*/
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
        const submission = await  WorkSubmissionModel.findById(submissionId).populate('clientId','_id name')
        const notificationService = req.app.get("notificationService");
       
        if(!submission || submission.clientId._id.toString()!==id ){
            return res.status(403).json({message:"Not authorized to review this submission."})
        }

         let parent = null;
         let parentType = null;
        if (submission.taskId) {
         parent = await MiniTask.findById(submission.taskId);
        if (parent) parentType = "miniTask";
        else {
        parent = await ServiceRequest.findById(submission.taskId);
        if (parent) parentType = "serviceRequest";
       }
       }

       const taskTitle = parentType === "miniTask" ? parent?.title : parent?.type || "Service Request";

         submission.status = status || submission.status
         submission.feedback = feedback || submission.feedback
         await submission.save()

         if(status === "approved"){
          await notificationService.sendSubmissionApprovedNotification({
             freelancerId:submission.freelancerId,
             taskTitle:taskTitle,
             clientName: submission.clientId.name,
             feedback:feedback
          })
         }else if(status === "revision_requested"){
           await notificationService.sendRevisionRequestedNotification({
             freelancerId:submission.freelancerId,
             taskTitle:taskTitle,
             clientName: submission.clientId.name,
             feedback:feedback
          })
         }else if(status === "rejected"){
            await notificationService.sendSubmissionRejectedNotification({
             freelancerId:submission.freelancerId,
             taskTitle:taskTitle,
             clientName: submission.clientId.name,
             feedback:feedback
            })
         }

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
const freelancerDeleteSubmission = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const submission = await WorkSubmissionModel.findById(submissionId);
        
        if (!submission || submission.status === 'approved') {
            return res.status(404).json({ message: "Can't remove this submission" });
        }
        
        const fileKeys = submission.files
            .map((i) => i.fileKey)
            .filter(key => key && typeof key === 'string' && key.trim().length > 0); 

        console.log('File keys to delete:', fileKeys);
        
        if (fileKeys.length > 0) {
            await deleteMultipleSubmissionFilesFromS3(fileKeys);
        } else {
            console.log('No valid file keys found to delete');
        }
        
        await submission.deleteOne();
        res.status(200).json({ message: "Submission Removed Successfully" });

    } catch (err) {
        console.log('Error in freelancerDeleteSubmission:', err);
        res.status(500).json({ message: "Internal server Error" });
    }
}

module.exports = {submitWork,viewSubmissions,reviewSubmission,getMySubmissions,
    freelancerDeleteSubmission,setSocketIO,generateUploadURL,generatePreviewURL}