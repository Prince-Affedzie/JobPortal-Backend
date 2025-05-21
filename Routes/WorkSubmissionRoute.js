const express = require('express')
const submissionRoute = express.Router()
const {upload} = require('../Utils/Mutler')
const {verify_token}= require('../MiddleWare/VerifyToken.js')
const  {submitWork,viewSubmissions,reviewSubmission,getMySubmissions,freelancerDeleteSubmission,
    generateUploadURL,generatePreviewURL
} = require('../Controllers/WorkSubmissionController.js')

submissionRoute.post('/submit_task_work/:taskId',verify_token,upload.array('files', 5),submitWork)
submissionRoute.get('/view_task_submissions/:taskId',verify_token,viewSubmissions)
submissionRoute.put('/review_task_submission/:submissionId',verify_token,reviewSubmission)
submissionRoute.get('/get_mysubmissions/:taskId',verify_token,getMySubmissions)
submissionRoute.delete('/delete/submission/:submissionId',verify_token,freelancerDeleteSubmission)
submissionRoute.post('/submissions/upload-url',verify_token,generateUploadURL)
submissionRoute.get('/get_preview_url',verify_token,generatePreviewURL)
module.exports ={submissionRoute}

