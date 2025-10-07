// controllers/disputeController.js
const Dispute = require('../Models/DisputeModel');
const {WorkSubmissionModel} = require('../Models/WorkSubmissionModel');
const {NotificationModel} = require('../Models/NotificationModel')
const { getUploadURL, getPublicURL } = require('../Services/aws_S3_file_Handling');
const {processEvent} = require('../Services/adminEventService')

let socketIO = null;

// This will be called by server.js to give us access to `io`
function setSocketIO(ioInstance) {
    socketIO = ioInstance;
}

const generateEvidenceUploadURL = async (req, res) => {
  try {
    
    const { filename, contentType } = req.body;
    const {id} = req.user
    const fileKey = `reporting-evidences/${id}/${Date.now()}-${filename}`;

    const uploadURL = await getUploadURL(fileKey,contentType);
    const publicUrl = getPublicURL(fileKey);
    res.status(200).json({ uploadURL,publicUrl });
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Failed to generate upload URL', details: err });
  }
};


const createDispute = async (req, res) => {
  try {
    const { against, submissionId, reason, taskId, details, evidence,tasktitle,reportedBy } = req.body;
    const notificationService = req.app.get('notificationService');
    
    const raisedBy = req.user.id;

    const dispute = await Dispute.create({
      raisedBy,
      against,
      taskId,
      submissionId,
      reason,
      details,
      evidence
    });

    await notificationService.sendDisputeRaisedNotification({
      opponent:dispute.against,
      taskTitle: tasktitle,
      reportedBy:reportedBy
    }) 
    processEvent('DISPUTE_RAISED',dispute);

    res.status(200).json(dispute);
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: 'Failed to raise dispute', error: err });
  }
};

// Get all disputes for admin
const getAllDisputes = async (req, res) => {
  
  try {
    const disputes = await Dispute.find()
      .populate('raisedBy against submissionId taskId resolvedBy').sort({createdAt:-1});
    res.status(200).json(disputes);
    
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: 'Failed to fetch disputes', error: err });
  }
};

const getDispute = async(req,res)=>{
  try{
     const {Id} = req.params
     const dispute = await Dispute.findById(Id)
     if(!dispute){
      return res.status(401).json({message: "Dispute Not Found"})
     }
     res.status(200).json(dispute)

  }catch(err){
    console.log(err)
    res.status(500).json({message: "Internal Server Error"})
  }
}

// Resolve a dispute
const resolveDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { resolutionNotes, newStatus } = req.body;
    const notificationService = req.app.get('notificationService');
    const adminId = req.user.id;

    const updated = await Dispute.findByIdAndUpdate(disputeId, {
      status: newStatus || updated.status,
      resolutionNotes,
      resolvedBy: adminId,
      updatedAt: new Date()
    }, { new: true });
    
   await notificationService.sendDisputeResolvedNotification({
    party1:updated.against,
    party2:updated.raisedBy,
    taskTitle:updated.taskId,
    resolution:resolutionNotes,
    caseId:updated._id,
   
   })
    res.status(200).json(updated);
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: 'Failed to resolve dispute', error: err });
  }
};


module.exports = {createDispute,getAllDisputes,resolveDispute,getDispute, generateEvidenceUploadURL,setSocketIO}
