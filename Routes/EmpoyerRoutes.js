const express = require("express")
const employerRoute = express.Router()
const {verifyEligibility} = require("../MiddleWare/EligibilityVerification.js")
const {verify_token}= require('../MiddleWare/VerifyToken.js')
const {upload} = require('../Utils/Mutler.js')
const {addJob,editJob,deleteJob,modifyApplication,viewSingleApplication,viewJob,modifyJobStatus,
    getAllPostedJobs,viewJobApplications,jobSearch,jobSearchFilter,viewAllApplications,interviewController,
    employerSignUp,createInterviewInvite,getEmployerProfile} = require('../Controllers/JobsControllerEmployers.js')

employerRoute.post("/h1/v1/employer_sign_up",verify_token,upload.single('businessDocs'),employerSignUp)
employerRoute.post("/h1/v1/add_job",verify_token,verifyEligibility,addJob)
employerRoute.put("/h1/v1/update_job/:Id",verify_token,verifyEligibility,editJob)
employerRoute.delete("/h1/v1/delete_job/:Id",verify_token,verifyEligibility,deleteJob)
employerRoute.get('/h1/v1/get_created/jobs',verify_token,getAllPostedJobs)
employerRoute.get('/h1/v1/view_job/applications/:Id',verify_token,viewJobApplications)
employerRoute.get('/h1/v1/view_all/applications',verify_token,viewAllApplications)
employerRoute.get('/h1/v1/view_application/:Id',verify_token,viewSingleApplication)
employerRoute.put('/h1/v1/modify/application',verify_token,modifyApplication)
employerRoute.get("/h1/v1/view_job/:Id",verify_token,viewJob)
employerRoute.put('/h1/v1/modify/job_status/:Id',verify_token,modifyJobStatus)
employerRoute.put('/h1/v1/interview_invite/:Id',verify_token,interviewController)
employerRoute.post('/h1/v1/create_interview_invite',verify_token,createInterviewInvite)
employerRoute.get('/h1/v1/get_employer_profile',verify_token,getEmployerProfile)



module.exports = {employerRoute}
