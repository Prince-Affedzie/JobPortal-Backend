const express = require('express');
const clientRouter = express.Router();
const { verify_token } = require('../MiddleWare/VerifyToken.js');
const { verifyMiniTaskPostingEligibility } = require('../MiddleWare/EligibilityVerification.js');
const {
    postMiniTask,
    assignMiniTask,
    acceptBid,
    getMyCreatedMiniTasks,
    viewMiniTaskInfo,
    getMicroTaskApplicants,
    getBids,
    editMiniTask,
    deleteMiniTask,
    markTaskDoneByClient,
    unmarkTaskDoneByClient,
    viewAllPayments,
    searchTaskers,
    getTaskers,
} = require("../Controllers/ClientController.js");
const {generateTaskMediaUploadURL} = require('../Services/portofolioFileUpload')

// Mini task creation and management
clientRouter.post("/h1/v2/post_mini_task", verify_token, verifyMiniTaskPostingEligibility, postMiniTask);
clientRouter.post("/h1/v2/generate_task_media_upload_url",verify_token,generateTaskMediaUploadURL)
clientRouter.put("/h1/v2/assign/mini_task/:taskId/:applicantId", verify_token, verifyMiniTaskPostingEligibility, assignMiniTask);
clientRouter.put("/h1/v2/accept_bid/mini_task/:taskId/:bidId", verify_token, verifyMiniTaskPostingEligibility, acceptBid);


// View employer's tasks and applicants
clientRouter.get("/h1/v2/get_created/mini_tasks", verify_token, getMyCreatedMiniTasks);
clientRouter.get("/h1/v2/get_task/details/:Id", verify_token,viewMiniTaskInfo);
clientRouter.get("/h1/v2/get_applicants/my_micro_task/:Id", verify_token, getMicroTaskApplicants);
clientRouter.get("/h1/v2/get_bids/my_micro_task/:Id", verify_token, getBids);

// Task editing and deletion
clientRouter.put("/h1/v2/edit/mini_task/:Id", verify_token, verifyMiniTaskPostingEligibility, editMiniTask);
clientRouter.put("/h1/v2/mark_task_as_done/client/:Id", verify_token, verifyMiniTaskPostingEligibility, markTaskDoneByClient);
clientRouter.put("/h1/v2/mark_task__undone/client/:Id", verify_token, verifyMiniTaskPostingEligibility, unmarkTaskDoneByClient);
clientRouter.delete("/h1/v2/delete/mini_task/:Id", verify_token, verifyMiniTaskPostingEligibility, deleteMiniTask);


// view Payments 
clientRouter.get('/h1/v2/get_all_payments',verify_token,viewAllPayments)

// Taskers Searching
clientRouter.post('/h1/v2/taskers-search',verify_token, searchTaskers)
clientRouter.get('/h1/v2/taskers-get',verify_token,getTaskers)
module.exports = { clientRouter };