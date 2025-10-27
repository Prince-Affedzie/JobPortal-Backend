const {ServiceRequest} = require( "../Models/ServiceRequestModel.js");

 const getAvailableRequests = async (req, res) => {
  try {
    const requests = await ServiceRequest.find({ status: "Open" })
      .populate("service")
      .populate("client");

    res.status(200).json(requests);
  } catch (err) {
    console.error("Error fetching open requests:", err);
    res.status(500).json({ message: "Server error" });
  }
};


 const getAssignedRequests = async (req, res) => {
  try {
     const tasker = req.user.id;
    const requests = await ServiceRequest.find({ assignedTasker: tasker})
      .populate("service")
      .populate("client");

    res.status(200).json(requests);
  } catch (err) {
    console.error("Error fetching open requests:", err);
    res.status(500).json({ message: "Server error" });
  }
};



 const acceptAssignedRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const tasker = req.user.id;

    const request = await ServiceRequest.findById(id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (String(request.assignedTasker) !== String(tasker))
      return res.status(403).json({ message: "Not authorized for this request" });

    request.status = "in_progress";
    await request.save();

    res.status(200).json({ message: "Request accepted and in progress", request });
  } catch (err) {
    console.error("Error accepting request:", err);
    res.status(500).json({ message: "Server error" });
  }
};


 const rejectAssignedRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const tasker = req.user.id;

    const request = await ServiceRequest.findById(id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (String(request.assignedTasker) !== String(tasker))
      return res.status(403).json({ message: "Not authorized for this request" });

    request.status = "pending";
    await request.save();

    res.status(200).json({ message: "Request Rejected", request });
  } catch (err) {
    console.error("Error accepting request:", err);
    res.status(500).json({ message: "Server error" });
  }
};


 const markServiceCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    const tasker = req.user.id;

    const request = await ServiceRequest.findById(id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (String(request.assignedTasker) !== String(tasker))
      return res.status(403).json({ message: "Not authorized for this request" });

    request.markedDoneByTasker = true;
    request.taskerDoneAt = new Date() || null;
    await request.save();

    res.status(200).json({ message: "Service marked as completed", request });
  } catch (err) {
    console.error("Error marking service completed:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getAssignedRequests,
  acceptAssignedRequest,
  rejectAssignedRequest,
  markServiceCompleted,}
