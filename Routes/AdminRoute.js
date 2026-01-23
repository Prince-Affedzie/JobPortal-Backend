const express = require('express')
const adminRouter = express.Router()
const {verify_token} =require('../MiddleWare/VerifyToken')
const {verifyAdminRouteAccess} = require('../MiddleWare/EligibilityVerification')

const {adminSignup,adminLogin,adminLogout,adminEditProfile,removeJob,adminProfile,adminAddUser,modifyUserInfo,
    getAllUsers,getSingleUser,removeUser,getAllJobs,getSingleJob,adminAddJob,controlJobStatus,upDateJob,getAllEmployerProfiles,
    getSingleEmployerProfile,modifyEmployerProfile,deleteEmployerProfile,getAllMiniTasks,getSingleMinitask,
    modifyMiniTaskStatus,deleteMiniTask, modifyMiniTask,fetchAlerts,markAlertsAsRead, markAlertAsRead,getAllTaskers,
    getTaskerDetails,updateTaskerStatus,getAllPayments,getASinglePayment,modifyPaymentStatus,
} = require('../Controllers/AdminController')

const {getAllServiceRequests,getServiceRequestById,getServiceRequestStats,updateServiceRequestStatus,assignTasker,
cancelServiceRequest,deleteServiceRequest,} = require('../Controllers/AdminServiceRequestController')

const {sendRoleBasedNotification ,broadCastNotification,sendSingleUserNotification} = require('../Controllers/AdminNotificationController')

adminRouter.post('/admin/signUp',adminSignup)
adminRouter.post('/admin/login',adminLogin)
adminRouter.post('/admin/logout',verify_token,adminLogout)
adminRouter.get('/admin/get_profile',verify_token, adminProfile)
adminRouter.put('/admin/edit_profile',verify_token,adminEditProfile)
adminRouter.get('/get/all_users',verify_token,getAllUsers)
adminRouter.post('/admin/add_new_user',verify_token,adminAddUser)
adminRouter.get('/admin/get_single_user/:Id',verify_token,getSingleUser)
adminRouter.put('/admin/modify_user_info/:Id',verify_token,modifyUserInfo)
adminRouter.delete('/admin/remove_user/:Id',verify_token,removeUser)
adminRouter.get('/admin/get_all_jobs',verify_token,getAllJobs)
adminRouter.get('/admin/get_single_job/:Id',verify_token,getSingleJob)
adminRouter.post('/admin/add_job',verify_token,adminAddJob)
adminRouter.put('/admin/change_job_status/:Id',verify_token,controlJobStatus)
adminRouter.put('/admin/update_job/:Id',verify_token,upDateJob)
adminRouter.delete('/admin/remove_job/:Id',verify_token,removeJob)
adminRouter.get('/admin/get_employers/profiles',verify_token,getAllEmployerProfiles)
adminRouter.get('/admin/get_single_employer/profile/:Id',verify_token,getSingleEmployerProfile)
adminRouter.put('/admin/update_employer_profile/:Id',verify_token,modifyEmployerProfile)
adminRouter.delete('/admin/delete_employer/profile/:Id',verify_token,deleteEmployerProfile)
adminRouter.get('/admin/get_all_mintasks',verify_token,getAllMiniTasks)
adminRouter.get('/admin/get_single_mintask/:Id',verify_token,getSingleMinitask)
adminRouter.put('/admin/modify_mini_task_status/:Id',verify_token,modifyMiniTaskStatus)
adminRouter.delete('/admin/delete_mini_task/:Id',verify_token,deleteMiniTask)
adminRouter.put('/admin/modify_mini_task/:Id', verify_token,modifyMiniTask)
adminRouter.get('/admin/all_alerts',verify_token,fetchAlerts)
adminRouter.put('/admin/alerts/mark-all-read',verify_token,markAlertsAsRead)
adminRouter.put('/admin/alerts/:id/read',verify_token,markAlertAsRead)
adminRouter.get('/admin/get_all_taskers',verify_token,getAllTaskers)
adminRouter.get('/admin/get_tasker_info/:taskerId',verify_token,getTaskerDetails)
adminRouter.put('/admin/update_tasker_status/:taskerId',verify_token,updateTaskerStatus)
adminRouter.get('/admin/get_all_payments',verify_token,getAllPayments)
adminRouter.get('/admin/get_a_single_payment/:paymentId',verify_token,getASinglePayment)
adminRouter.put('/admin/update_payment_record/:paymentId',verify_token,modifyPaymentStatus)




// Service Request Management

adminRouter.get("/admin/service/requests",verify_token, getAllServiceRequests);
adminRouter.get("/admin/service/request/:id", verify_token, getServiceRequestById);
adminRouter.patch("/admin/service/update/:id/status", verify_token, updateServiceRequestStatus);
adminRouter.patch("/admin/service/request/:id/assign", verify_token, assignTasker);
adminRouter.patch("/admin/service/request/:id/cancel", verify_token, cancelServiceRequest);
adminRouter.delete("/admin/service/request/:id/delete", verify_token,deleteServiceRequest);
adminRouter.get("/admin/service/requests/stats/overview", verify_token,getServiceRequestStats);


// Notification Controller Routes
adminRouter.post('/admin/send-single-user/notification/:userId',verify_token,sendSingleUserNotification)
adminRouter.post('/admin/send-broadcast/notification',verify_token,broadCastNotification)
adminRouter.post('/admin/send-role-based/notification',verify_token,sendRoleBasedNotification)

module.exports = {adminRouter}


