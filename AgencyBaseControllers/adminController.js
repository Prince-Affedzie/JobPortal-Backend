const {ServiceRequest} = require( "../Models/ServiceRequestModel.js");


 const getAllServiceRequests = async (req, res) => {
  try {
    const requests = await ServiceRequest.find()
      .populate("client")
      .populate("assignedTasker")
      .populate("service");

    res.status(200).json(requests);
  } catch (err) {
    console.error("Error fetching all service requests:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getServiceRequestById = async(req,res)=>{
    try{
        const {id} = req.params
        const request = await ServiceRequest.findById(id)
      .populate("client")
      .populate("assignedTasker")
      .populate("service");
       if (!request) return res.status(404).json({ message: "Service request not found" });

    res.status(200).json(request);


    }catch(err){
    console.error("Error fetching all service requests:", err);
    res.status(500).json({ message: "Server error" }); 
    }
}


const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["confirmed", "rejected"];
    if (!validStatuses.includes(status))
      return res.status(400).json({ message: "Invalid status update" });

    const request = await ServiceRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!request) return res.status(404).json({ message: "Service request not found" });
    res.status(200).json({ message: `Request ${status.toLowerCase()} successfully`, request });
  } catch (err) {
    console.error("Error updating service request:", err);
    res.status(500).json({ message: "Server error" });
  }
};


 const deleteServiceRequest = async(req,res)=>{
    try{
     const { id } = req.params;
      const request = await ServiceRequest.findById(id)
       if (!request) return res.status(404).json({ message: "Service request not found" });
       await request.deleteOne()

    }catch (err) {
    console.error("Error updating service request:", err);
    res.status(500).json({ message: "Server error" });
  }
}


 const assignTasker = async (req, res) => {
  try {
    const { id } = req.params;
    const { taskerId } = req.body;

    const request = await ServiceRequest.findById(id);
    if (!request) return res.status(404).json({ message: "Service request not found" });

    request.assignedTasker = taskerId;
    request.status = "Assigned";
    await request.save();

    res.status(200).json({ message: "Tasker assigned successfully", request });
  } catch (err) {
    console.error("Error assigning tasker:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {getAllServiceRequests,
  getServiceRequestById,
  assignTasker,
  updateRequestStatus,}
