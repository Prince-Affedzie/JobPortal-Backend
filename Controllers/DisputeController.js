// controllers/disputeController.js
const Dispute = require('../Models/DisputeModel');
const {WorkSubmissionModel} = require('../Models/WorkSubmissionModel');
const {NotificationModel} = require('../Models/NotificationModel')

let socketIO = null;

// This will be called by server.js to give us access to `io`
function setSocketIO(ioInstance) {
    socketIO = ioInstance;
}



const createDispute = async (req, res) => {
  try {
    const { against, submissionId, reason, taskId, details,tasktitle,reportedBy } = req.body;
    console.log(req.body)
    const raisedBy = req.user.id;

    const dispute = await Dispute.create({
      raisedBy,
      against,
      taskId,
      submissionId,
      reason,
      details
    });

   const notification = new NotificationModel({
         user: against,
         message:`Hey, A report has been raised on this task: "${tasktitle}" by ${reportedBy}. Due to that the task is under review.
         Our team would reach out as soon as possible to resolving any hanging issues.`,
         title:"Issue Report"
    
            })
      if (socketIO) {
            socketIO.to(against.toString()).emit('notification', notification);
            console.log(`Notification sent to ${against}`);
        } else {
            console.warn("SocketIO is not initialized!");
        }
      await notification.save()

    res.status(200).json(dispute);
  } catch (err) {
    res.status(500).json({ message: 'Failed to raise dispute', error: err });
  }
};

// Get all disputes for admin
const getAllDisputes = async (req, res) => {
  console.log("Executing")
  try {
    const disputes = await Dispute.find()
      .populate('raisedBy against submissionId taskId resolvedBy');
    res.status(200).json(disputes);
    console.log(disputes)
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
    console.log(req.body)
    const adminId = req.user.id;

    const updated = await Dispute.findByIdAndUpdate(disputeId, {
      status: newStatus || updated.status,
      resolutionNotes,
      resolvedBy: adminId,
      updatedAt: new Date()
    }, { new: true });

    res.status(200).json(updated);
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: 'Failed to resolve dispute', error: err });
  }
};


module.exports = {createDispute,getAllDisputes,resolveDispute,getDispute,setSocketIO}
