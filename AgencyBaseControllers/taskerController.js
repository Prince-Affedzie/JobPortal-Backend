const {ServiceRequest} = require( "../Models/ServiceRequestModel.js");

 const getAvailableRequests = async (req, res) => {
  try {
    const taskerId = req.user.id;

    
    let filter = {
      $or: [
        {
          status: 'Pending',
          notifiedTaskers: taskerId
        },
        {
          assignedTasker: taskerId
        }
      ]
    };

    const requests = await ServiceRequest.find(filter)
      .populate("client")
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (err) {
    console.error("Error fetching available requests:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getSingleServiceRequest = async(req,res)=>{
    try{

        const {requestId} = req.params
       
        
     const request = await ServiceRequest.findOne({ _id:requestId})
          .populate("client")
          .populate('offers.tasker')
          
     
      if (!request) return res.status(404).json({ message: "Request not found" });
     
      res.status(200).json(request)

    }catch (err) {
    console.error("Error fetching client requests:", err);
    res.status(500).json({ message: "Server error" });
  }
}



const submitOffer = async (req, res) => {
  try {
    const { requestId } = req.params;
    const taskerId = req.user.id;
    const { amount, message } = req.body;
    const notificationService = req.app.get("notificationService");

    const serviceRequest = await ServiceRequest.findById(requestId);

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    // Check if tasker was notified about this request
    if (!serviceRequest.notifiedTaskers.includes(taskerId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to submit an offer for this request'
      });
    }

    // Check if tasker already submitted an offer
    const existingOffer = serviceRequest.offers.find(
      offer => offer.tasker.toString() === taskerId
    );

    if (existingOffer) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted an offer for this request'
      });
    }

    // Check if request is still open for offers
    if (serviceRequest.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'This request is no longer accepting offers'
      });
    }

    // Add new offer
    serviceRequest.offers.push({
      tasker: taskerId,
      amount,
      message: message || '',
      status: 'pending'
    });

    await serviceRequest.save();

    // Notify client about new offer
    await notificationService.notifyClientNewOffer(
      serviceRequest.client,
      serviceRequest._id,
      taskerId
    );

    res.status(201).json({
      success: true,
      message: 'Offer submitted successfully',
      data: {
        offer: serviceRequest.offers[serviceRequest.offers.length - 1]
      }
    });

  } catch (error) {
    console.error('Submit offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit offer'
    });
  }
};


const getTaskerOffers = async (req, res) => {
  try {
    const taskerId = req.user.id;
    const { status } = req.query;

    const filter = {
      'offers.tasker': taskerId
    };

    if (status) {
      filter['offers.status'] = status;
    }

    const requests = await ServiceRequest.find(filter)
      .populate('client', 'name profileImage rating')
      .select('type description status budget preferredDate urgency offers')
      .sort({ createdAt: -1 })
      

    // Extract only the tasker's offers from each request
    const offers = requests.map(request => {
      const taskerOffer = request.offers.find(
        offer => offer.tasker.toString() === taskerId
      );
      return {
        request: {
          _id: request._id,
          type: request.type,
          description: request.description,
          status: request.status,
          budget: request.budget,
          preferredDate: request.preferredDate,
          urgency: request.urgency,
          client: request.client
        },
        offer: taskerOffer
      };
    });

    const total = await ServiceRequest.countDocuments(filter);

    res.status(200).json(offers);

  } catch (error) {
    console.error('Get tasker offers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your offers'
    });
  }
};



const updateOffer = async (req, res) => {
  try {
    const { requestId, offerId } = req.params;
    const taskerId = req.user.id;
    const { amount, message, action="update" } = req.body; // action: 'update' or 'withdraw'
    const notificationService = req.app.get("notificationService");

    const serviceRequest = await ServiceRequest.findById(requestId);

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    const offer = serviceRequest.offers.id(offerId);
    if (!offer || offer.tasker.toString() !== taskerId) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    if (offer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify offer in current status'
      });
    }

    if (action === 'withdraw') {
      // Remove the offer
      serviceRequest.offers.pull({ _id: offerId });
      await serviceRequest.save();

      res.status(200).json({
        success: true,
        message: 'Offer withdrawn successfully'
      });

    } else if (action === 'update') {
      // Update offer details
      if (amount !== undefined) offer.amount = amount;
      if (message !== undefined) offer.message = message;
      
      await serviceRequest.save();

      // Notify client about offer update
      await notificationService.notifyClientOfferUpdated(
        serviceRequest.client,
        serviceRequest._id,
        taskerId
      );

      res.status(200).json({
        success: true,
        message: 'Offer updated successfully',
        data: { offer }
      });

    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action'
      });
    }

  } catch (error) {
    console.error('Update offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update offer'
    });
  }
};

 const getAssignedRequests = async (req, res) => {
  try {
     const tasker = req.user.id;
    const requests = await ServiceRequest.find({ assignedTasker: tasker})
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
    const { requestId } = req.params;
    const tasker = req.user.id;
    const notificationService = req.app.get("notificationService");


    const request = await ServiceRequest.findById(requestId).populate('assignedTasker','_id name');
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (String(request.assignedTasker) !== String(tasker))
      return res.status(403).json({ message: "Not authorized for this request" });

    request.markedDoneByTasker = true;
    request.taskerDoneAt = new Date() || null;
    await request.save();

    await notificationService.sendTaskerMarkedDoneNotification({
    clientId:request.client,
    taskTitle:request.type,
    taskerName:request.assignedTasker.name,
    });

    if (request.markedDoneByEmployer) {
      request.status = "Completed";
      await notificationService.sendTaskCompletedNotification({
      clientId: request.client,
      taskerId: request.assignedTasker._id,
      taskTitle: request.type
    });
    }else{
       request.status = "Review"
    }

    res.status(200).json({ message: "Service marked as completed", request });
  } catch (err) {
    console.error("Error marking service completed:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { 
  
  getAvailableRequests,
  submitOffer,
  getTaskerOffers,
  updateOffer,
  getAssignedRequests,
  acceptAssignedRequest,
  rejectAssignedRequest,
  markServiceCompleted,
getSingleServiceRequest,}
