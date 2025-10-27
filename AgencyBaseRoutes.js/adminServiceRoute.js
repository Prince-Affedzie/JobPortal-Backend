const express = require('express');
const {
  getAllServiceRequests,
  getServiceRequestById,
  assignTasker,
  updateRequestStatus,
  deleteServiceRequest,
} = require("../AgencyBaseControllers/adminController.js");
const { verify_token } = require('../MiddleWare/VerifyToken.js');

const adminServiceRouter = express.Router();

// Get all service requests
adminServiceRouter.get("/service/admin/get-all-service-requests", verify_token, getAllServiceRequests);

// Get details of a specific service request
adminServiceRouter.get("/service/admin/get-single-service-request/:id", verify_token, getServiceRequestById);

// Assign a tasker to a service request manually (optional)
adminServiceRouter.patch("/service/admin/request/:id/assign", verify_token, assignTasker);

// Update status (e.g. from "pending" → "in progress" → "completed")
adminServiceRouter.patch("/service/admin/:id/status-update", verify_token, updateRequestStatus);

// Delete a request (only if needed)
adminServiceRouter.delete("/service/admin/:id/remove", verify_token, deleteServiceRequest);

module.exports = {adminServiceRouter}
