const {ServiceRequest} = require( "../Models/ServiceRequestModel.js");
const ConversationRoom = require('../Models/ConversationRoom');

const {Service} = require("../Models/ServiceModel.js");
const { getUploadURL, getPublicURL,deleteFromS3,deleteMultipleFromS3, } = require('../Services/aws_S3_file_Handling');


 const createServiceRequest = async (req, res) => {
  try {
    const {type, description, address,requirements, preferredDate, preferredTime, budget, urgency, media,taskerIds } = req.body;
    const clientId = req.user.id;
    const notificationService = req.app.get("notificationService");
  
     const serviceRequest = new ServiceRequest({
      client: clientId,
      type,
      description,
      address,
      requirements: requirements || [],
      media: media || [],
      preferredDate,
      preferredTime,
      urgency,
      budget,
      notifiedTaskers: taskerIds || [], 
      status: "Pending"
    });

    await serviceRequest.save()

    
     if (taskerIds && taskerIds.length > 0) {
      await notificationService.notifyTaskersForNewRequest(
        taskerIds,
        serviceRequest._id,
        clientId
      );
    }

    res.status(200).json({ message: "Service request created successfully"});
  } catch (err) {
    console.error("Error creating service request:", err);
    res.status(500).json({ message: "Server error" });
  }
};


 const getClientRequests = async (req, res) => {
  try {
    const client = req.user.id;
    const requests = await ServiceRequest.find({ client })
      .populate('assignedTasker')
      .populate('offers.tasker')
      .sort({ createdAt: -1 })

    res.status(200).json(requests);
  } catch (err) {
    console.error("Error fetching client requests:", err);
    res.status(500).json({ message: "Server error" });
  }
};

 const getSingleServiceRequest = async(req,res)=>{
    try{

        const {requestId} = req.params
        const client = req.user.id
        
     const request = await ServiceRequest.findOne({ _id:requestId, client })
          .populate("assignedTasker")
          .populate('offers.tasker')
          .populate('notifiedTaskers');
     
      if (!request) return res.status(404).json({ message: "Request not found" });
      res.status(200).json(request)

    }catch (err) {
    console.error("Error fetching client requests:", err);
    res.status(500).json({ message: "Server error" });
  }
}


const updateServiceRequest = async(req,res)=>{
  try{
        
        const {requestId} = req.params
        const update = req.body
        const client = req.user.id
        const notificationService = req.app.get("notificationService");

         const request = await ServiceRequest.findOne({ _id:requestId, client })
         if (!request) return res.status(404).json({ message: "Request not found" });
         if (['Booked', 'In-progress', 'Completed'].includes(request.status)) {
        return res.status(400).json({
        success: false,
        message: 'Cannot make changes to This Service Request'
      });
    }

       Object.assign(request,update)
       await request.save()
       //console.log(request.notifiedTaskers)
    
       const taskerIds = request.notifiedTaskers.map(id => id.toString());
       await notificationService.notifyTaskersAboutRequestUpdate({
       taskerIds:taskerIds,
       requesTitle:request.type,
       clientId:client
     });


      return res.status(200).json({message:"Service Updated Successfully"})
  }catch (err) {
    console.error("Error fetching client requests:", err);
    res.status(500).json({ message: "Server error" });
  }
}



const acceptOffer = async (req, res) => {
  try {
    const { requestId, offerId } = req.params;
    const clientId = req.user.id;
    const notificationService = req.app.get("notificationService");

    const serviceRequest = await ServiceRequest.findOne({
      _id: requestId,
      client: clientId
    });

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found'
      });
    }

    // Find the offer
    const offer = serviceRequest.offers.id(offerId);
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    if (offer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Offer is no longer available'
      });
    }

    // Update offer status and assign tasker
    offer.status = 'accepted';
    serviceRequest.assignedTasker = offer.tasker;
    serviceRequest.status = 'Booked';
    serviceRequest.finalCost = offer.amount;

    // Decline all other pending offers
    serviceRequest.offers.forEach(otherOffer => {
      if (otherOffer._id.toString() !== offerId && otherOffer.status === 'pending') {
        otherOffer.status = 'declined';
      }
    });

    await serviceRequest.save();

    // Notify the accepted tasker
    await notificationService.notifyTaskerOfferAccepted(
      offer.tasker,
      serviceRequest._id
    );

   
    const declinedTaskers = serviceRequest.offers
      .filter(o => o.status === 'declined' && o._id.toString() !== offerId)
      .map(o => o.tasker);

    await notificationService.notifyTaskersOfferDeclined(
      declinedTaskers,
      serviceRequest._id
    );

    res.status(200).json({
      success: true,
      message: 'Offer accepted successfully',
      data: {
        request: serviceRequest,
        acceptedOffer: offer
      }
    });

  } catch (error) {
    console.error('Accept offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept offer'
    });
  }
};



 const cancelServiceRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const client = req.user.id;
    const notificationService = req.app.get("notificationService");

    const serviceRequest = await ServiceRequest.findOne({ _id: requestId, client });
    if (!serviceRequest) return res.status(404).json({ message: "Request not found" });

    if (['Booked', 'In-progress', 'Completed'].includes(serviceRequest.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel request in current status'
      });
    }


   serviceRequest.status = "Canceled";
    await serviceRequest.save();
   
    const taskersToNotify = serviceRequest.offers
      .filter(offer => offer.status === 'pending')
      .map(offer => offer.tasker);

    await notificationService.notifyTaskersRequestCanceled(
      taskersToNotify,
      serviceRequest._id
    );


    res.status(200).json({ message: "Service request canceled successfully" });
  } catch (err) {
    console.error("Error cancelling service request:", err);
    res.status(500).json({ message: "Server error" });
  }
};


const deleteServiceRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const client = req.user.id;
    const notificationService = req.app.get("notificationService");

    const serviceRequest = await ServiceRequest.findOne({ _id: requestId, client });
    if (!serviceRequest) return res.status(404).json({ message: "Request not found" });

    if (['Booked', 'In-progress', 'Completed'].includes(serviceRequest.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel request in current status'
      });
    }

     const fileUrls = serviceRequest.media.map((i)=>i.url)
     deleteMultipleFromS3(fileUrls).catch(console.error())

    const taskersToNotify = serviceRequest.offers
      .filter(offer => offer.status === 'pending')
      .map(offer => offer.tasker);

   
    await serviceRequest.deleteOne();
   
   
    await notificationService.notifyTaskersRequestCanceled(
      taskersToNotify,
      serviceRequest._id
    );


    res.status(200).json({ message: "Service request canceled successfully" });
  } catch (err) {
    console.error("Error cancelling service request:", err);
    res.status(500).json({ message: "Server error" });
  }
};



const markServiceDone = async (req, res) => {
  try {
    const { requestId } = req.params;
    const client = req.user.id;
    const notificationService = req.app.get('notificationService');

    const request =  await ServiceRequest.findOne({ _id: requestId,client}).populate('client', '_id name');
    if (!request) return res.status(404).json({ message: "Service not found" });

    request.markedDoneByEmployer = true;
    request.employerDoneAt = new Date();
    await notificationService.sendClientMarkedDoneNotification({
    taskerId: request.assignedTasker,
    taskTitle: request.type,
    clientName: request.client.name,
    });

    // Auto-complete if both marked
    if (request.markedDoneByTasker) {
      request.status = "Completed";
      await notificationService.sendTaskCompletedNotification({
      clientId: request.client._id,
      taskerId: request.assignedTasker,
      taskTitle: request.type
    });
    }

    await request.save();
    return res.status(200).json({ message: "Marked done by employer", request });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


module.exports = { createServiceRequest,
  getClientRequests,
  getSingleServiceRequest,
  acceptOffer,
  cancelServiceRequest,
 deleteServiceRequest,
 markServiceDone,
 updateServiceRequest,

}