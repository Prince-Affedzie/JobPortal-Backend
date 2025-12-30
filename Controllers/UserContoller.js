const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const  { StreamChat} = require('stream-chat')
const  cloudinary =require('../Config/Cloudinary')
const streamifier = require('streamifier');
const validator = require("validator")
const CloudinaryFileUploadService  = require('../Services/cloudinaryFileUpload')
const {getUploadURL, getPublicURL, deleteFromS3,deleteMultipleFromS3} = require('../Services/aws_S3_file_Handling')
const {UserModel} = require("../Models/UserModel")
const {MiniTask} = require('../Models/MiniTaskModel')
const {Service} = require('../Models/ServiceModel')
const {NotificationModel} = require('../Models/NotificationModel')
const {sendPasswordResetEmail} = require("../Services/emailService")
const {processEvent} = require('../Services/adminEventService')
const {geocodeAddress} = require('../Utils/geoService')
const {getServiceTagFromSkill} = require('../Services/serviceTagAssignment')
const fs = require('fs');
const path = require('path');
const io = require('../app')

const client = new StreamChat('c9tbyybnmgwt','a3mkxyqbncbd3q8uq3n6gvxjpwzrcb6pwrdp65tnuxvn75angqecgtck8wzph7wg');
const { uploader } = cloudinary; 


const signUp = async(req,res)=>{
    
    const {name,email,role,password,} =req.body
    console.log("Signing Up")

    try{
    if(!name || !email || !role || !password){
        return res.status(400).json({message: "All fields are required"})
    }

    if(!validator.isEmail(email)){
        return res.status(400).json({message:"Invalid Email"})
    }
    const lowerCaseEmail = email.toLowerCase()
    const userExist = await UserModel.findOne({email: lowerCaseEmail })
    if(userExist){
        return res.status(400).json({mesaage: "Email had Already been taken"})
    }
    const hashedPassword = await bcrypt.hash(password,10)

    const user = new UserModel({
        name,
        email,
        role,
        password:hashedPassword
    })

    await user.save()
    const token = jwt.sign({id:user._id,role:user.role},process.env.token,{expiresIn:"1d"})
    res.cookie("token",token,{httpOnly:true,sameSite:"None",secure:true})
    processEvent("NEW_USER",user);
    res.status(200).json({message:"Registration Successful",role:user.role,user:user,token:token})
}catch(err){
    console.log(err)
    res.status(500).json({message:"Internal Server Error"})
}

}

const login = async(req,res)=>{
    const {email,password} = req.body
   console.log("Logging In")

    try{
        if (!email || !password){
            return res.status(400).json({message:"All fields are required"})
        }
        const lowerCaseEmail = email.toLowerCase()
        const findUser = await UserModel.findOne({email:lowerCaseEmail})
               .populate({
               path: 'ratingsReceived.ratedBy',
               select: 'name profileImage role email phone'
              })
              .exec();
        if(!findUser){
            return res.status(404).json({message: "Account doesn't Exist"})
        }
        const isPasswordMatch = await bcrypt.compare(password,findUser.password)
        if(!isPasswordMatch){
            return res.status(401).json({message:"Invalid email or Password"})
        }
        const token = jwt.sign({id:findUser._id,role:findUser.role},process.env.token,{expiresIn:"1d"})
        res.cookie("token",token,{httpOnly:true,sameSite:"None",secure:true})
        res.status(200).json({message:"Login Successful",role:findUser.role,user:findUser,token:token})

    }catch(err){
        console.log(err)
        return res.status(500).json({message: "Internal Server Error"})
    }

}

const requestPasswordReset = async(req,res)=>{
  try{
    const {email} = req.body
     const lowerCaseEmail = email.toLowerCase()
    const user = await UserModel.findOne({email:lowerCaseEmail});
    if (!user){
        return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent'
      })
    }
    const token = jwt.sign({id:user._id,role:user.role},process.env.token, {expiresIn:"1h"})
    res.cookie("token",token,{httpOnly:true, sameSite:'None',secure:true})

     const resetPasswordTemplate = fs.readFileSync(
     path.join(__dirname, '../Static/templates/reset-password-email.html'),
    'utf8'
     );
     const resetUrl = `${process.env.Frontend_Url}/reset-password`;
     const emailHtml = resetPasswordTemplate.replace(/{{resetUrl}}/g, resetUrl);

     await sendPasswordResetEmail(email,emailHtml )

    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent'
    });

  }catch(err){
    console.log(err)
    res.status(500).json({message: "Internal Server Error"})
  }
}

const  resetPassword = async(req,res)=>{
  try{
    const {password} = req.body
    const {id} = req.user
    const user = await UserModel.findById(id)
    if(!user){
      return res.status(404).json({message: "User Account Not Found"})
    }
    const hashedPassword = await bcrypt.hash(password,10);
    user.password = hashedPassword;
    await user.save()
    res.status(200).json({
      message: "Password Reset Has been Successful"
    })

  }catch(err){
   console.log(err)
   res.status(500).json({message: "Internal Server Error"})
  }
}

const logout =async(req,res)=>{
    const {token} = req.cookies
    if(!token){
        return res.status(400).json({message:"No token Provided"})
    }
    await res.clearCookie(token,{httpOnly:true,secure:true,sameSite:'Strict'})
    res.status(200).json({message:"Logout Succesful"})
}

const editProfile = async(req,res)=>{
    try{
         
        const {email,phone,skills,education,workExperience,workPortfolio,Bio,location,profileImage} = req.body
        
       
        const {id} = req.user
        const user = await UserModel.findById(id)
        if(!user){
            return res.staus(404).json("Account Doesn't Exist")
        }
        const oldProfileImage = user.profileImage

        if(location){
          const addressString = `${location.street || ""}, ${location.town || ""}, ${
          location.city || ""
         }, ${location.region || ""}`;
         const geo = await geocodeAddress(addressString);

        if (geo) {
         user.location = {
          ...location,
           latitude: geo.latitude,
           longitude: geo.longitude,
          coordinates: [geo.longitude, geo.latitude], 
          };
       }else{
             user.location = location || user.location
       }

        }

        if(profileImage && profileImage !== oldProfileImage){
           deleteFromS3(oldProfileImage).catch(console.error);
           
        }
        
        user.email = email || user.email
        user.phone = phone || user.phone
        user.skills = skills || user.skills
        user.education = education || user.education
        user.workExperience = workExperience || user.workExperience
        user.Bio = Bio || user.Bio
        user.workPortfolio = workPortfolio ||  user.workPortfolio
        user.profileImage =profileImage || user.profileImage

        if (skills) {
   
       const newServiceTags = []; 

    for (let skill of skills) {
        const match = await getServiceTagFromSkill(skill);
       
        if (match) newServiceTags.push(match);
    }
    
    
     const existingTags = Array.isArray(user.serviceTags) ? user.serviceTags : [];
    
      user.serviceTags = [
        ...existingTags, 
        ...newServiceTags 
     ];
     }
        await user.save()
        res.status(200).json({message:"Profile Updated Successfully"})


       
    }catch(err){
        console.log(err)
        res.status(500).json({message: "Internal Server Error"})
    }
}



const onboarding = async (req, res) => {
    try {
        const { 
            phone, 
            primaryService, 
            secondaryServices, // Array of strings e.g., ["Cleaning", "Painting"]
            skills, 
            education, 
            workExperience, 
            workPortfolio, 
            Bio, 
            location, 
            profileImage, 
            idCard 
        } = req.body;
        
        
        const { id } = req.user;
        const user = await UserModel.findById(id);

        if (!user) {
            return res.status(404).json({ message: "Account Doesn't Exist" });
        }

        // 1. Phone validation
        if (phone && phone !== user.phone) {
            const phoneExist = await UserModel.findOne({ phone: phone });
            if (phoneExist) {
                return res.status(403).json({ message: "Phone Number Already Exists" });
            }
            user.phone = phone;
        }

        // 2. Map standard fields
        user.skills = skills || user.skills;
        user.education = education || user.education;
        user.workExperience = workExperience || user.workExperience;
        user.Bio = Bio || user.Bio;
        user.workPortfolio = workPortfolio || user.workPortfolio;
        user.profileImage = profileImage || user.profileImage;
        user.idCard = idCard || user.idCard;

        // 3. Geocoding logic
        const addressString = `${location?.street || ""}, ${location?.town || ""}, ${location?.city || ""}, ${location?.region || ""}`;
        const geo = await geocodeAddress(addressString);

        if (geo) {
            user.location = {
                ...location,
                latitude: geo.latitude,
                longitude: geo.longitude,
                coordinates: [geo.longitude, geo.latitude],
            };
        } else {
            user.location = location || user.location;
        }

        // 4. Handle Service Tags from skills
        const serviceTags = [];
        if (skills) {
            for (let skill of skills) {
                const match = await getServiceTagFromSkill(skill);
                if (match) serviceTags.push(match);
            }
        }
        user.serviceTags = serviceTags;

        // 5. PRIMARY SERVICE MAPPING
        if (primaryService) {
            const findService = await Service.findOne({ name: primaryService });
            if (findService) {
                user.primaryService = {
                    serviceId: findService._id,
                    serviceName: findService.name
                };
                
                if (!findService.providers.includes(user._id)) {
                    findService.providers.push(user._id);
                    await findService.save();
                }
            }
        }

        if (secondaryServices && Array.isArray(secondaryServices)) {
            const secondaryObjects = [];
            
            for (const serviceName of secondaryServices) {
                const foundService = await Service.findOne({ name: serviceName });
                
                if (foundService) {
                    secondaryObjects.push({
                        serviceId: foundService._id,
                        serviceName: foundService.name
                    });

                    
                    if (!foundService.providers.includes(user._id)) {
                        foundService.providers.push(user._id);
                        await foundService.save();
                    }
                }
            }
            user.secondaryServices = secondaryObjects;
        }

        await user.save();
        res.status(200).json({ message: "Profile Updated Successfully", user });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


const handleImageUpdate = async(req,res)=>{
    try{
        const {id} = req.user
        const user = await UserModel.findById(id)
        if(!user){
            return res.staus(404).json("Account Doesn't Exist")
        }
        console.log(req.body)
        console.log(req.file)
        if (req.file) {
           user.profileImage = await CloudinaryFileUploadService.uploadProfileImage(req.file.buffer);
        }
          await user.save()
          res.status(200).json({message:"Profile Updated Successfully"})
    }catch(err){
        console.log(err)
    }
}

const viewProfile = async(req,res)=>{
    try{
        const {id} =req.user
        const user = await UserModel.findById(id)
          .populate({
             path: 'ratingsReceived.ratedBy',
             select: 'name profileImage role email phone'
           })
           .exec();
          

        if(!user){
            return res.status(404).json({message:"Account not Found"})
        }
        res.status(200).json(user)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}


const chat = async (req, res) => {
    try {

   
      const { id } = req.user;
      const { targetUserId } = req.body;
  
      if (!id) {
        return res.status(400).json({ error: 'User ID is required' });
      }
  
      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
  
      // Always upsert the current user
      await client.upsertUser({
        id: user._id.toString(),
        name: user.name,
        image: user.profileImage || 'https://getstream.io/random_png/',
      });
  
      // Optional: If a target user is provided, also upsert and include in response
      let targetUserData = null;
  
      if (targetUserId) {
        const targetUser = await UserModel.findById(targetUserId);
        if (!targetUser) {
          return res.status(400).json({ message: 'Target user not found' });
        }
  
        await client.upsertUser({
          id: targetUser._id.toString(),
          name: targetUser.name,
          image: targetUser.profileImage || 'https://getstream.io/random_png/',
        });
  
        targetUserData = {
          id: targetUser._id.toString(),
          name: targetUser.name,
          image: targetUser.profileImage || 'https://getstream.io/random_png/',
        };
      }
  
      const token = client.createToken(user._id.toString());
     const userData = {
        id: user._id.toString(),
        name: user.name,
        image: user.profileImage || 'https://getstream.io/random_png/',
        ...(targetUserId && { targetUserId }), 
        ...(targetUserData && { targetUserData }), 
      }

      return res.status(200).json({ token,userData});
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal server Error' });
    }
  };

  const getNotifications = async(req,res)=>{
    try{

        const {id} = req.user
       
        const notifications = await NotificationModel.find({user:id}).sort({createdAt:-1})
        
        res.status(200).json(notifications)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
  }

  const createNotification = async(req,res)=>{
    try{
        const {userId,message,type} = req.body
        const notification = new NotificationModel({
            user:userId,
            type:type,
            message:message,
            

    })
     io.to(userId).emit('notification',notification)
        await notification.save()
        res.status(200).json(notification)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
  }

  const markNotificationAsRead =async(req,res)=>{
    try{
        const {ids} = req.body
        console.log(req.body)
        await NotificationModel.updateMany({_id:{$in:ids}},{$set:{read:true}})
        res.status(200).json({ success: true });

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})

    }
  }

  const deleteNotification = async(req,res)=>{
    try{
      const {Id} = req.params
      console.log(Id)
      const notification = await NotificationModel.findById(Id)
      if(!notification){
        return res.status(404).json({message:"Notification not Found"})
      }
      await notification.deleteOne()
      res.status(200).json({message:"Notification Deleted Successfully"})

    }catch(err){
      console.log(err)
      res.status(500).json({message:"Internal Server Error"})
    }
  }

  const deleteBulkNotification = async(req,res)=>{
    try{
        const ids = req.body
        console.log(req.body)
        await NotificationModel.deleteMany({_id:{$in:ids}})
        res.status(200).json({message:"Notifications Deleted Successfully"})
    }catch(err){
      console.log(err)
      res.status(500).json({message:"Internal Server Error"})
    }
  }


  const updatePushToken = async(req,res)=>{
    try{
      const {id} = req.user
      const {token} = req.body
      const user  = await UserModel.findById(id)
      user.pushToken = token
      await user.save()
      res.status(200).json({message:'Push Token Updated Successfully'})

    }catch(err){
      console.log(err)
      res.status(500).json({message:"Internal Server Error"})
    }
  }


  const switchAccouunt = async(req,res)=>{
    try{
       const {id} = req.user
       const findUser = await UserModel.findById(id)
       if(!findUser){
        res.status(404).json({message:'User Account not Found'})
       }
       findUser.role === 'job_seeker'?findUser.role = 'client':findUser.role = 'job_seeker'
       await findUser.save()
       res.status(200).json({message:'Account Switch Successful',user:findUser})


    }catch(err){
      console.log(err)
      res.status(500).json({message:"Internal Server Error"})
    }
  }

  const deleteAccount = async(req,res)=>{
    try{
      const {id} = req.user
      const user =  await UserModel.findById(id)
       if(!user){
        res.status(404).json({message:'User Account not Found'})
       }
      if(user.profileImage){
        deleteFromS3(user.profileImage).catch(console.error);
       }
       if(user.idCard){
        deleteFromS3(user.idCard).catch(console.error);
       }
       await user.deleteOne()
       res.status(200).json({message:"Account deleted Successfully"})

    }catch(err){
      console.log(err)
      res.status(500).json({message:"Internal Server Error"})
    }
  }
  

//https://adeesh.hashnode.dev/building-a-real-time-notification-system-with-mern-stack-and-socketio-a-step-by-step-guide


module.exports = {signUp,login,logout,editProfile,viewProfile,onboarding,requestPasswordReset, resetPassword,deleteBulkNotification,
    chat,getNotifications,createNotification, markNotificationAsRead, handleImageUpdate, deleteNotification, updatePushToken, 
    switchAccouunt,deleteAccount }