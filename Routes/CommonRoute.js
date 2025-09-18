const express = require('express');
const commonRouter = express.Router();
const { verify_token } = require('../MiddleWare/VerifyToken.js');
const {
    allJobs,
    viewJob,
    jobSearch,
    jobSearchFilter,
    getMiniTasks,
    viewMiniTaskInfo
} = require("../Controllers/CommonController.js");

// Job browsing and searching
commonRouter.get('/h1/v2/job_list', verify_token, allJobs);
commonRouter.get('/h1/v2/view_details/:Id', verify_token, viewJob);
commonRouter.get('/h1/v2/filter_f1', verify_token, jobSearch);
commonRouter.get("/h1/v1/filter_f2", verify_token, jobSearchFilter);

// Mini task browsing
commonRouter.get('/h1/v2/get/mini_tasks', verify_token, getMiniTasks);
commonRouter.get("/h1/v2/get_min_task_info/:Id", verify_token, viewMiniTaskInfo);

module.exports = { commonRouter };