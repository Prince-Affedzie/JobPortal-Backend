const express = require("express")
const userRouter = express.Router()
const {signUpByGoogle,signUp,google_login,login,logout,onboarding,editProfile,viewProfile,chat,getNotifications,createNotification,deleteBulkNotification,deleteNotification, 
  switchAccouunt,   markNotificationAsRead,handleImageUpdate,requestPasswordReset,resetPassword,updatePushToken,deleteAccount} = require('../Controllers/UserContoller')
const {generatePortfolioUploadURL,generateProfileImageUploadURL,generateIdCardUploadURL} = require('../Services/portofolioFileUpload')
const {upload} = require('../Config/Mutler')
const {validateInput} = require('../Validators/ValidatePassword')
const {verify_token} = require("../MiddleWare/VerifyToken")

userRouter.post("/user/signup",validateInput,signUp)
userRouter.post("/user/google-signup",signUpByGoogle)
userRouter.post("/user/google-login",google_login)
userRouter.post("/user/login",login)
userRouter.post("/user/request-password-reset",requestPasswordReset)
userRouter.post("/user/reset-password",verify_token,resetPassword)
userRouter.post("/user/logout",verify_token,logout)
userRouter.put("/user/edit_profile",verify_token,upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'idCardImage', maxCount: 1 }
]),editProfile)

userRouter.put("/user/onboarding",verify_token,upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'idCardImage', maxCount: 1 }
]),onboarding)

userRouter.post("/user/upload-profile-image",verify_token,generateProfileImageUploadURL)
userRouter.post("/user/upload-id-card",verify_token,generateIdCardUploadURL)
userRouter.get("/user/view_profile",verify_token,viewProfile)
userRouter.post('/user/athenticate',verify_token,chat )
userRouter.post('/notifications',verify_token,createNotification)
userRouter.get('/notifications',verify_token,getNotifications)
userRouter.put('/mark_notifications/read',verify_token,markNotificationAsRead)
userRouter.post('/user/upload_portfolio',verify_token,generatePortfolioUploadURL)

userRouter.delete('/delete/notification/:Id',verify_token,deleteNotification)
userRouter.post('/delete/bulk_notification',verify_token,deleteBulkNotification)
//,deleteBulkNotification,deleteNotification

// Push Token Settings
userRouter.post('/user/push-token', verify_token,updatePushToken )

//
userRouter.put('/user/switch/account',verify_token, switchAccouunt)

// Account deletion
userRouter.delete('/user/delete/account',verify_token,deleteAccount)


module.exports = {userRouter}