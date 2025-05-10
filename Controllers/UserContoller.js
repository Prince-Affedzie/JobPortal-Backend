const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const  { StreamChat} = require('stream-chat')
const  cloudinary =require('../Utils/Cloudinary')
const streamifier = require('streamifier');
const validator = require("validator")
const {UserModel} = require("../Models/UserModel")
const {MiniTask} = require('../Models/MiniTaskModel')
const {NotificationModel} = require('../Models/NotificationModel')
const io = require('../app')

const client = new StreamChat('c9tbyybnmgwt','a3mkxyqbncbd3q8uq3n6gvxjpwzrcb6pwrdp65tnuxvn75angqecgtck8wzph7wg');
const { uploader } = cloudinary; 


const signUp = async(req,res)=>{
    
    const {name,email,role,password,} =req.body

    try{
    if(!name || !email || !role || !password){
        return res.status(400).json({message: "All fields are required"})
    }

    if(!validator.isEmail(email)){
        return res.status(400).json({message:"Invalid Email"})
    }

    const userExist = await UserModel.findOne({email})
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
    res.status(200).json({message:"Registration Successful",role:user.role})
}catch(err){
    console.log(err)
    res.status(500).json({message:"Internal Server Error"})
}





}

const login = async(req,res)=>{
    const {email,password} = req.body

    try{
        if (!email || !password){
            return res.status(400).json({message:"All fields are required"})
        }
        const findUser = await UserModel.findOne({email})
        if(!findUser){
            return res.status(404).json({message: "Account doesn't Exist"})
        }
        const isPasswordMatch = await bcrypt.compare(password,findUser.password)
        if(!isPasswordMatch){
            return res.status(401).json({message:"Invalid email or Password"})
        }
        const token = jwt.sign({id:findUser._id,role:findUser.role},process.env.token,{expiresIn:"1d"})
        res.cookie("token",token,{httpOnly:true,sameSite:"None",secure:true})
        res.status(200).json({message:"Login Successful",role:findUser.role})

    }catch(err){
        console.log(err)
        return res.status(500).json({message: "Internal Server Error"})
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
         console.log(req.body)
         console.log(req.files)
        const {email,phone,skills,education,workExperience,Bio,location, businessName,businessRegistrationProof} = req.body
        const {id} = req.user
        const user = await UserModel.findById(id)
        if(!user){
            return res.staus(404).json("Account Doesn't Exist")
        }
        if (req.file) {
          const uploadedImage = await new Promise((resolve, reject) => {
            const stream = uploader.upload_stream(
              {
                folder: 'user_profiles',
                resource_type: 'auto',
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
    
            streamifier.createReadStream(req.file.buffer).pipe(stream);
          });
    
          console.log('Uploaded image URL:', uploadedImage.secure_url);
          user.profileImage = uploadedImage.secure_url;
        }
        
        user.email = email || user.email
        user.phone = phone || user.phone
        user.skills = skills || user.skills
        user.education = education || user.education
        user.workExperience = workExperience || user.workExperience
        user.Bio = Bio || user.Bio
        user.location = location || user.location

        if(businessName || businessRegistrationProof){
            user.businessName = businessName || null
            user.businessRegistrationProof = businessRegistrationProof || null
        }

        await user.save()
        res.status(200).json({message:"Profile Updated Successfully"})


       
    }catch(err){
        console.log(err)
        res.status(500).json({message: "Internal Server Error"})
    }
}

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
          const uploadedImage = await new Promise((resolve, reject) => {
            const stream = uploader.upload_stream(
              {
                folder: 'user_profiles',
                resource_type: 'auto',
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
    
            streamifier.createReadStream(req.file.buffer).pipe(stream);
          });
    
          console.log('Uploaded image URL:', uploadedImage.secure_url);
          user.profileImage = uploadedImage.secure_url;
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
        ...(targetUserId && { targetUserId }), // 👈 optional: only include if provided
        ...(targetUserData && { targetUserData }), // optional: detailed info about target
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
  

//https://adeesh.hashnode.dev/building-a-real-time-notification-system-with-mern-stack-and-socketio-a-step-by-step-guide


module.exports = {signUp,login,logout,editProfile,viewProfile, 
    chat,getNotifications,createNotification, markNotificationAsRead, handleImageUpdate }