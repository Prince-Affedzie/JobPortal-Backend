const express = require('express');
const taskerRouter = express.Router();
const { upload } = require('../Config/Mutler.js');
const { verify_token } = require('../MiddleWare/VerifyToken.js');
const {
    updateTaskerProfile,
    Taskerboarding,
    getOwnTaskerProfile,
    getNearbyTasks,
    applyOrBidMiniTask,
    negotiateOnMiniTask,
    acceptMiniTaskAssignment,
    rejectMiniTaskAssignment,
    getRecentJobApplications,
    yourAppliedMiniTasks,
    removeAppliedMiniTasksFromDashboard,
    markTaskDoneByTasker,
    unmarkTaskDoneByTasker,
    viewEarnings,
    updateAvailability ,
    addPaymentMethod,
    modifyPaymentMethod,
    deletePaymentMethod,
    addWorkSamplesToProfile,
    removeWorkSample,
    getBidById,
    updateBid ,
    withdrawBid,
    getMiniTasks,
} = require("../Controllers/TaskerController.js");

taskerRouter.get('/h1/v2/get/mini_tasks', verify_token, getMiniTasks);

// Profile Management
taskerRouter.post('/tasker/onboard',verify_token,upload.fields([
  { name: 'brandBanner', maxCount: 1 },
  { name: 'idCardImage', maxCount: 1 }
]),Taskerboarding)
taskerRouter.post('/tasker/update_profile',verify_token,upload.fields([
  { name: 'brandBanner', maxCount: 1 },
  { name: 'idCardImage', maxCount: 1 }
]),updateTaskerProfile)
taskerRouter.get('/tasker/my_profile',verify_token,getOwnTaskerProfile)

// Job application routes
//taskerRouter.post('/h1/v2/apply/:Id', verify_token, upload.single("resume"), applyToJob);
taskerRouter.post('/h1/v2/mini_task/apply/:Id', verify_token, applyOrBidMiniTask);
taskerRouter.post('/h1/v2/mini_task/negotiate/:Id',verify_token,negotiateOnMiniTask)
taskerRouter.get('/h1/v2/get_nearby_tasks',verify_token,getNearbyTasks)

// Task assignment acceptance/rejection
taskerRouter.put("/h1/v2/accept_task_assignment/:Id", verify_token, acceptMiniTaskAssignment);
taskerRouter.put("/h1/v2/reject_task_assignment/:Id", verify_token, rejectMiniTaskAssignment);
taskerRouter.put("/h1/v2/mark_task_as_done/tasker/:Id", verify_token, markTaskDoneByTasker);
taskerRouter.put("/h1/v2/mark_task__undone/tasker/:Id", verify_token, unmarkTaskDoneByTasker);


taskerRouter.get("/h1/v2/get/recent_applications", verify_token, getRecentJobApplications);

// Mini task management
taskerRouter.get("/h1/v2/get_your_applied/mini_tasks", verify_token, yourAppliedMiniTasks);
taskerRouter.put('/h1/v2/remove_mini_task_from_dashboard', verify_token, removeAppliedMiniTasksFromDashboard);

//earnings
taskerRouter.get("/h1/v2/view_all_earnings",verify_token,viewEarnings)

//Availability
taskerRouter.patch("/h1/v2/update_availability",verify_token,updateAvailability )

// Payment Method
taskerRouter.post("/h1/v2/add_payment_method",verify_token,addPaymentMethod)
taskerRouter.put("/h1/v2/update_payment_method/:methodId",verify_token, modifyPaymentMethod)
taskerRouter.delete("/h1/v2/delete_payment_method/:methodId",verify_token, deletePaymentMethod)

// Work sample adding
taskerRouter.post("/h1/v2/add_work_sample_to_profile",verify_token,addWorkSamplesToProfile)
taskerRouter.delete("/h1/v2/remove_work_sample_from_profile/:sampleId",verify_token,removeWorkSample)

//Bid Management
taskerRouter.get('/h1/v2/get_bid/:bidId',verify_token, getBidById);
taskerRouter.put('/h1/v2/update_bid/:bidId', verify_token,updateBid);
taskerRouter.delete('/h1/v2/withdraw_bid/:bidId',verify_token, withdrawBid);


module.exports = { taskerRouter };