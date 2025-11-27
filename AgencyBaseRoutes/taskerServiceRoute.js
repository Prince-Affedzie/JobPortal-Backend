const express =require('express');
const {
  getAvailableRequests,
  submitOffer,
  getTaskerOffers,
  updateOffer,
  getAssignedRequests,
  acceptAssignedRequest,
  rejectAssignedRequest,
  markServiceCompleted,
  getSingleServiceRequest,
  //updateProgress,
} = require("../AgencyBaseControllers/taskerController.js");
const { verify_token } = require('../MiddleWare/VerifyToken.js');

const taskerServiceRouter = express.Router();

// Get all service requests assigned to this tasker
taskerServiceRouter.get("/service/tasker/summoned-requests", verify_token, getAvailableRequests);
taskerServiceRouter.get("/service/tasker/request/:requestId", verify_token, getSingleServiceRequest);
taskerServiceRouter.post("/service/requests/:requestId/offers",verify_token, submitOffer)
taskerServiceRouter.get("/service/offers",verify_token, getTaskerOffers)
taskerServiceRouter.patch('/service/requests/:requestId/offers/:offerId', verify_token, updateOffer);

taskerServiceRouter.get("/service/tasker/assigend-requests", verify_token, getAssignedRequests);

// Accept or reject a job offer
taskerServiceRouter.patch("/service/tasker/request/:id/accept", verify_token, acceptAssignedRequest);
taskerServiceRouter.patch("/service/tasker/request/:id/reject",verify_token, rejectAssignedRequest);

// Update progress (e.g. "on the way", "in progress", etc.)
//taskerServiceRouter.patch("/:id/progress", verify_token, updateProgress);

// Mark job as completed
taskerServiceRouter.patch("/service/tasker-mark-service/:requestId/complete", verify_token, markServiceCompleted);

//export default taskerServiceRouter;
module.exports = {taskerServiceRouter}