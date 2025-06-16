// controllers/disputeController.js
const Dispute = require('../Models/DisputeModel');
const {WorkSubmissionModel} = require('../Models/WorkSubmissionModel');


const createDispute = async (req, res) => {
  try {
    const { against, submissionId, reason, taskId, details } = req.body;
    const raisedBy = req.user.id;

    const dispute = await Dispute.create({
      raisedBy,
      against,
       taskId,
      submissionId,
      reason,
      details
    });

    res.status(201).json(dispute);
  } catch (err) {
    res.status(500).json({ message: 'Failed to raise dispute', error: err });
  }
};

// Get all disputes for admin
const getAllDisputes = async (req, res) => {
  try {
    const disputes = await Dispute.find()
      .populate('raisedBy against submissionId taskId resolvedBy');
    res.status(200).json(disputes);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch disputes', error: err });
  }
};

// Resolve a dispute
const resolveDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { resolutionNotes, newStatus } = req.body;
    const adminId = req.user.id;

    const updated = await Dispute.findByIdAndUpdate(disputeId, {
      status: newStatus,
      resolutionNotes,
      resolvedBy: adminId,
      updatedAt: new Date()
    }, { new: true });

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to resolve dispute', error: err });
  }
};


module.exports = {createDispute,getAllDisputes,resolveDispute}
