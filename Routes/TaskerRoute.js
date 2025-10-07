const express = require('express');
const taskerRouter = express.Router();
const { upload } = require('../Config/Mutler.js');
const { verify_token } = require('../MiddleWare/VerifyToken.js');
const {
    applyToJob,
    applyOrBidMiniTask,
    acceptMiniTaskAssignment,
    rejectMiniTaskAssignment,
    viewAllApplications,
    viewApplication,
    getRecentJobApplications,
    yourAppliedMiniTasks,
    removeAppliedMiniTasksFromDashboard,
    markTaskDoneByTasker,
    unmarkTaskDoneByTasker,
    viewEarnings,
} = require("../Controllers/TaskerController.js");

// Job application routes
taskerRouter.post('/h1/v2/apply/:Id', verify_token, upload.single("resume"), applyToJob);
taskerRouter.post('/h1/v2/mini_task/apply/:Id', verify_token, applyOrBidMiniTask);

// Task assignment acceptance/rejection
taskerRouter.put("/h1/v2/accept_task_assignment/:Id", verify_token, acceptMiniTaskAssignment);
taskerRouter.put("/h1/v2/reject_task_assignment/:Id", verify_token, rejectMiniTaskAssignment);
taskerRouter.put("/h1/v2/mark_task_as_done/tasker/:Id", verify_token, markTaskDoneByTasker);
taskerRouter.put("/h1/v2/mark_task__undone/tasker/:Id", verify_token, unmarkTaskDoneByTasker);

// Application viewing routes
taskerRouter.get("/h1/v2/view_applications", verify_token, viewAllApplications);
taskerRouter.get("/h1/v2/view_application/:Id", verify_token, viewApplication);
taskerRouter.get("/h1/v2/get/recent_applications", verify_token, getRecentJobApplications);

// Mini task management
taskerRouter.get("/h1/v2/get_your_applied/mini_tasks", verify_token, yourAppliedMiniTasks);
taskerRouter.put('/h1/v2/remove_mini_task_from_dashboard', verify_token, removeAppliedMiniTasksFromDashboard);

//earnings
taskerRouter.get("/h1/v2/view_all_earnings",verify_token,viewEarnings)

module.exports = { taskerRouter };