const {ServiceRequest} = require( "../Models/ServiceRequestModel");

const {Service} = require("../Models/ServiceModel.js");

 const createServiceRequest = async (req, res) => {
  try {
    const { serviceId, description, location,requirements, preferredDate, preferredTime, budget, urgency, attachments } = req.body;
    const client = req.user.id;

    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ message: "Service not found" });

    const request = await ServiceRequest.create({
      service: service._id,
      client,
      description,
      requirements,
      location,
      preferredDate,
      preferredTime,
      urgency,
      budget,
      attachments,
    });

    res.status(201).json({ message: "Service request created successfully", request });
  } catch (err) {
    console.error("Error creating service request:", err);
    res.status(500).json({ message: "Server error" });
  }
};


 const getClientRequests = async (req, res) => {
  try {
    const client = req.user.id;
    const requests = await ServiceRequest.find({ client })
      .populate("service")
      .populate("assignedTasker");

    res.status(200).json(requests);
  } catch (err) {
    console.error("Error fetching client requests:", err);
    res.status(500).json({ message: "Server error" });
  }
};

 const getSingleServiceRequest = async(req,res)=>{
    try{

        const {id} = req.params
        const client = req.user.id
        
     const request = await ServiceRequest.findOne({ _id: id, client })
          .populate("service")
          .populate("assignedTasker");
     if (!request) return res.status(404).json({ message: "Request not found" });
      res.status(200).json(request)

    }catch (err) {
    console.error("Error fetching client requests:", err);
    res.status(500).json({ message: "Server error" });
  }
}


 const cancelServiceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const client = req.user.id;

    const request = await ServiceRequest.findOne({ _id: id, client });
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (["In Progress", "Completed"].includes(request.status))
      return res.status(400).json({ message: "Cannot cancel a request already in progress or completed" });

    request.status = "Cancelled";
    await request.save();

    res.status(200).json({ message: "Service request cancelled successfully" });
  } catch (err) {
    console.error("Error cancelling service request:", err);
    res.status(500).json({ message: "Server error" });
  }
};


module.exports = { createServiceRequest,
  getClientRequests,
  getSingleServiceRequest,
  cancelServiceRequest,}