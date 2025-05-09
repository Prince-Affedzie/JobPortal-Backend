const express = require('express')
const adminRouter = express.Router()
const {verify_token} =require('../MiddleWare/VerifyToken')
const {verifyAdminRoute} = require('../MiddleWare/EligibilityVerification')

const {adminSignup,adminLogin,adminLogout,adminEditProfile,removeJob,adminProfile,adminAddUser,modifyUserInfo,
    getAllUsers,getSingleUser,removeUser,getAllJobs,getSingleJob,adminAddJob,controlJobStatus,upDateJob,getAllEmployerProfiles,
    getSingleEmployerProfile,modifyEmployerProfile,deleteEmployerProfile,getAllMiniTasks,getSingleMinitask,
    modifyMiniTaskStatus,deleteMiniTask, modifyMiniTask
} = require('../Controllers/AdminController')

adminRouter.post('/admin/signUp',adminSignup)
adminRouter.post('/admin/login',adminLogin)
adminRouter.post('/admin/logout',verify_token,verifyAdminRoute,adminLogout)
adminRouter.get('/admin/get_profile',verify_token,verifyAdminRoute, adminProfile)
adminRouter.put('/admin/edit_profile',verify_token,verifyAdminRoute,adminEditProfile)
adminRouter.get('/get/all_users',verify_token, verifyAdminRoute,getAllUsers)
adminRouter.post('/admin/add_new_user',verify_token,verifyAdminRoute,adminAddUser)
adminRouter.get('/admin/get_single_user/:Id',verify_token,verifyAdminRoute,getSingleUser)
adminRouter.put('/admin/modify_user_info/:Id',verify_token,verifyAdminRoute,modifyUserInfo)
adminRouter.delete('/admin/remove_user/:Id',verify_token,verifyAdminRoute,removeUser)
adminRouter.get('/admin/get_all_jobs',verify_token,verifyAdminRoute,getAllJobs)
adminRouter.get('/admin/get_single_job/:Id',verify_token,verifyAdminRoute,getSingleJob)
adminRouter.post('/admin/add_job',verify_token,verifyAdminRoute,adminAddJob)
adminRouter.put('/admin/change_job_status/:Id',verify_token,verifyAdminRoute,controlJobStatus)
adminRouter.put('/admin/update_job/:Id',verify_token,verifyAdminRoute,upDateJob)
adminRouter.delete('/admin/remove_job/:Id',verify_token,verifyAdminRoute,removeJob)
adminRouter.get('/admin/get_employers/profiles',verify_token,verifyAdminRoute,getAllEmployerProfiles)
adminRouter.get('/admin/get_single_employer/profile/:Id',verify_token,verifyAdminRoute,getSingleEmployerProfile)
adminRouter.put('/admin/update_employer_profile/:Id',verify_token,verifyAdminRoute,modifyEmployerProfile)
adminRouter.delete('/admin/delete_employer/profile/:Id',verify_token,verifyAdminRoute,deleteEmployerProfile)
adminRouter.get('/admin/get_all_mintasks',verify_token,verifyAdminRoute,getAllMiniTasks)
adminRouter.get('/admin/get_single_mintask/:Id',verify_token,verifyAdminRoute,getSingleMinitask)
adminRouter.put('/admin/modify_mini_task_status/:Id',verify_token,verifyAdminRoute,modifyMiniTaskStatus)
adminRouter.delete('/admin/delete_mini_task/:Id',verify_token,verifyAdminRoute,deleteMiniTask)
adminRouter.put('/admin/modify_mini_task/:Id', verify_token,verifyAdminRoute,modifyMiniTask)

module.exports = {adminRouter}