const { ServiceRequest } = require("../Models/ServiceRequestModel");


const getAllServiceRequests = async (req, res) => {
  try {
    const { status, type, urgency } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (urgency) filter.urgency = urgency;

    const requests = await ServiceRequest.find(filter)
      .populate("client", "name email phone profileImage")
      .populate("assignedTasker", "name email phone profileImage")
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: error.message });
  }
};



const getServiceRequestById = async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id)
      .populate("client", "name email phone profileImage")
      .populate("assignedTasker", "name email phone profileImage")
      .populate("offers.tasker", "name email phone profileImage");

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    res.status(200).json( request );
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



const updateServiceRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "Pending", "Quoted", "Booked", "In-progress",
      "Review", "Canceled", "Completed", "Closed"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const request = await ServiceRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};




const assignTasker = async (req, res) => {
  try {
    const { taskerId } = req.body;

    const request = await ServiceRequest.findByIdAndUpdate(
      req.params.id,
      {
        assignedTasker: taskerId,
        status: "Booked",
      },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    res.status(200).json({
      success: true,
      message: "Tasker assigned successfully",
      data: request,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



const cancelServiceRequest = async (req, res) => {
  try {
    const request = await ServiceRequest.findByIdAndUpdate(
      req.params.id,
      { status: "Canceled" },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    res.status(200).json({
      success: true,
      message: "Service request canceled",
      data: request,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



const deleteServiceRequest = async (req, res) => {
  try {
    const request = await ServiceRequest.findByIdAndDelete(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    res.status(200).json({
      success: true,
      message: "Service request deleted permanently",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



const getServiceRequestStats = async (req, res) => {
  try {
    const total = await ServiceRequest.countDocuments();
    const pending = await ServiceRequest.countDocuments({ status: "Pending" });
    const active = await ServiceRequest.countDocuments({ status: "In-progress" });
    const completed = await ServiceRequest.countDocuments({ status: "Completed" });

    res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        active,
        completed,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {getAllServiceRequests,getServiceRequestById,getServiceRequestStats,
    updateServiceRequestStatus,assignTasker,cancelServiceRequest,deleteServiceRequest,}




