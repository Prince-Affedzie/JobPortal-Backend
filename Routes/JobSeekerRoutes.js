const express = require('express')
const seekRouter = express.Router()
const {upload} = require('../Utils/Mutler')
const {viewJob,viewAllApplications,viewApplication,applyToJob,jobSearch,acceptMiniTaskAssignment,rejectMiniTaskAssignment,
    jobSearchFilter,allJobs,postMiniTask,getMiniTasks,applyToMiniTask,viewMiniTaskInfo,removeAppliedMiniTasksFromDashboard,
    assignMiniTask,getRecentJobApplications,getCreatedMiniTasks,editMiniTask,deleteMiniTask,yourAppliedMiniTasks} = require("../Controllers/JobsControllerJobseekers")
const {verify_token}= require('../MiddleWare/VerifyToken.js')
const {verifyMiniTaskPostings} =require('../MiddleWare/EligibilityVerification.js')


seekRouter.post('/h1/v2/apply/:Id',verify_token,upload.single("resume"),applyToJob)
seekRouter.post('/h1/v2/mini_task/apply/:Id',verify_token,applyToMiniTask)
seekRouter.post("/h1/v2/post_mini_task",verify_token,verifyMiniTaskPostings,postMiniTask)
seekRouter.put("/h1/v2/assign/mini_task/:taskId/:applicantId",verify_token,verifyMiniTaskPostings,assignMiniTask)
seekRouter.get('/h1/v2/view_details/:Id',verify_token,viewJob)
seekRouter.get('/h1/v2/job_list',verify_token,allJobs)
seekRouter.get('/h1/v2/get/mini_tasks',verify_token,getMiniTasks)
seekRouter.get('/h1/v2/filter_f1',verify_token,jobSearch)
seekRouter.get("/h1/v1/filter_f2",verify_token,jobSearchFilter)
seekRouter.get("/h1/v2/view_apllications",verify_token,viewAllApplications)
seekRouter.get("/h1/v2/view_application/:Id",verify_token,viewApplication)
seekRouter.get("/h1/v2/get/recent_applications",verify_token,getRecentJobApplications)
seekRouter.get("/h1/v2/get_created/mini_tasks",verify_token,getCreatedMiniTasks)
seekRouter.put("/h1/v2/edit/mini_task/:Id",verify_token,verifyMiniTaskPostings,editMiniTask)
seekRouter.delete("/h1/v2/delete/mini_task/:Id",verify_token,verifyMiniTaskPostings,deleteMiniTask)
seekRouter.get("/h1/v2/get_your_apllied/mini_tasks",verify_token,yourAppliedMiniTasks)
seekRouter.get("/h1/v2/get_min_task_info/:Id",verify_token,viewMiniTaskInfo)
seekRouter.put("/h1/v2/accept_task_assignment/:Id",verify_token,acceptMiniTaskAssignment)
seekRouter.put("/h1/v2/reject_task_assignment/:Id",verify_token,rejectMiniTaskAssignment)
seekRouter.put('/h1/v2/remove_mini_task_from_dashboard',verify_token,removeAppliedMiniTasksFromDashboard)

module.exports = {seekRouter}
