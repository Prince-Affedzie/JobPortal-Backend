const express = require("express")
const userRouter = express.Router()
const {signUp,login,logout,editProfile,viewProfile,chat,getNotifications,createNotification, 
    markNotificationAsRead,handleImageUpdate,requestPasswordReset,resetPassword} = require('../Controllers/UserContoller')
const {upload} = require('../Config/Mutler')
const {validateInput} = require('../Validators/ValidatePassword')
const {verify_token} = require("../MiddleWare/VerifyToken")

userRouter.post("/user/signup",validateInput,signUp)
userRouter.post("/user/login",login)
userRouter.post("/user/request-password-reset",requestPasswordReset)
userRouter.post("/user/reset-password",verify_token,resetPassword)
userRouter.post("/user/logout",verify_token,logout)
userRouter.put("/user/edit_profile",verify_token,upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'idCardImage', maxCount: 1 }
]),editProfile)

userRouter.put("/user/image_profile",verify_token,upload.single("profileImage"),handleImageUpdate)
userRouter.get("/user/view_profile",verify_token,viewProfile)
userRouter.post('/user/athenticate',verify_token,chat )
userRouter.post('/notifications',verify_token,createNotification)
userRouter.get('/notifications',verify_token,getNotifications)
userRouter.put('/mark_notifications/read',verify_token,markNotificationAsRead)


module.exports = {userRouter}