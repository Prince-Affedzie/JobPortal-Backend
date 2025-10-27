const express =require('express');
const {
  getAssignedRequests,
  acceptAssignedRequest,
  rejectAssignedRequest,
  markServiceCompleted,
  //updateProgress,
} = require("../AgencyBaseControllers/taskerController.js");
const { verify_token } = require('../MiddleWare/VerifyToken.js');

const taskerServiceRouter = express.Router();

// Get all service requests assigned to this tasker
taskerServiceRouter.get("/service/tasker/assigend-request-info", verify_token, getAssignedRequests);

// Accept or reject a job offer
taskerServiceRouter.patch("/service/tasker/request/:id/accept", verify_token, acceptAssignedRequest);
taskerServiceRouter.patch("/service/tasker/request/:id/reject",verify_token, rejectAssignedRequest);

// Update progress (e.g. "on the way", "in progress", etc.)
//taskerServiceRouter.patch("/:id/progress", verify_token, updateProgress);

// Mark job as completed
taskerServiceRouter.patch("/service/tasker-mark-service/:id/complete", verify_token, markServiceCompleted);

//export default taskerServiceRouter;
module.exports = {taskerServiceRouter}