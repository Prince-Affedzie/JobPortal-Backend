const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const validator = require("validator")
const {UserModel} = require("../Models/UserModel")
const {JobModel} = require('../Models/JobsModel')
const {MiniTask} =require("../Models/MiniTaskModel")
const {Alert} =require("../Models/AlertModel")
const EmployerProfile = require('../Models/EmployerProfile')
const {Payment} = require('../Models/PaymentModel')

const adminSignup = async(req,res)=>{
    const {name,email,password,} =req.body
    try{
        if(!name || !email ||  !password){
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
                role:'admin',
                password:hashedPassword
            })
        
            await user.save()
            const token = jwt.sign({id:user._id,role:user.role},process.env.token,{expiresIn:"4h"})
            res.cookie("token",token,{httpOnly:true,sameSite:"strict",secure:true})
            res.status(200).json({message:"Registration Successful",role:user.role})

    }catch(err){
        console.log(err)
        res.status(500).json({message:'Internal Server Error'})
    }
}

const adminLogin = async(req,res)=>{
    const {email,password} = req.body

    try{
        if (!email || !password){
            return res.status(400).json({message:"All fields are required"})
        }
        const findUser = await UserModel.findOne({email})
        if(!findUser || findUser.role !== 'admin'){
            return res.status(404).json({message: "UnAuthorised Access"})
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


const adminLogout =async(req,res)=>{
    const {token} = req.cookies
    if(!token){
        return res.status(400).json({message:"No token Provided"})
    }
    await res.clearCookie(token,{httpOnly:true,secure:true,sameSite:'Strict'})
    res.status(200).json({message:"Logout Succesful"})
}

const adminProfile = async(req,res)=>{
    try{
        const {id} = req.user
        const user = await UserModel.findById(id)
        if(!user){
            return res.status(400).json({message:'User not Found'})
        }
        res.status(200).json(user)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const adminEditProfile = async(req,res)=>{
    try{
       
        const {email,phone,password} = req.body
        const {id} = req.user
        const user = await UserModel.findById(id)
        if(!user){
            return res.staus(404).json("Account Doesn't Exist")
        }
        if(req.file && req.file.fieldname === "profile_image"){
            user.profileImage = req.file.filename
            
        }
        if(password){
            const hashedPassword = await bcrypt.hash(password,10)
            user.password = hashedPassword 
        }
        user.email = email || user.email
        user.phone = phone || user.phone
    
        await user.save()
        res.status(200).json({message:"Profile Updated Successfully"})


       
    }catch(err){
        console.log(err)
        res.status(500).json({message: "Internal Server Error"})
    }
}


const getAllUsers = async(req,res)=>{
    try{
        const users = await UserModel.find().sort({createdAt:-1})
        res.status(200).json(users)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Sever Error"})
    }
}

const getSingleUser = async(req,res)=>{
    try{
        const {Id} = req.params

        const user = await UserModel.findById(Id).populate('appliedJobs','title').populate('appliedMiniTasks','title budget')
        if(!user){
            return res.status(400).json({message:'User not Found'})
        }
        res.status(200).json(user)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const adminAddUser = async(req,res)=>{
    try{
         const {name,email,role,password,} =req.body
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
            res.cookie("token",token,{httpOnly:true,sameSite:"strict",secure:false})
            res.status(200).json({message:"Registration Successful",role:user.role})
        }catch(err){
        console.log(err)
        res.status(500).json({message: "Internal Server Error"})
    }
}

const modifyUserInfo =async(req,res)=>{
    try{
        const {Id} = req.params
        const update = req.body
        const user = await UserModel.findById(Id)
        if(!user){
            return res.status(404).json({message:"User not Found"})
        }
        Object.assign(user,update)
        await user.save()
        res.status(200).json({messgae:"User Update Successful"})


    }catch(err){
        console.log(error)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const removeUser = async(req,res)=>{
    try{
        const {Id} = req.params
        const user = await UserModel.findById(Id)
        if(!user){
            return res.status(400).json({message:'User not Found'})
        }
        await user.deleteOne()
        res.status(200).json({message:'User Removed Successfully'})

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const getAllJobs = async(req,res)=>{
    try{
        const {category,search,type} = req.query
        const query = {}
        if(category && category !=="All Categories"){
            query.category = category
        }
        if(type && type !=="All Types"){
            query.type = type
        }
        if(search){
            query.$or=[
                {title:{$regex:search,$options:'i'}},
                {description:{$regex:search,$options:'i'}}
            ]
        }

        const jobs = await JobModel.find(query).sort({createdAt:-1})
        res.status(200).json(jobs)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const adminAddJob = async(req,res)=>{
    try{

        const {id} = req.user
                const {title,description,category,jobType,industry,deliveryMode,company, companyEmail,
                location,paymentStyle, salary,skillsRequired,experienceLevel,responsibilities, deadLine,tags} = req.body
                
        
                
        
                const job = new JobModel({
                    title:title,
                    description: description,
                    category:category,
                    jobType:jobType,
                    industry:industry,
                    deliveryMode:deliveryMode,
                    location:location,
                    paymentStyle:paymentStyle,
                    salary:salary,
                    skillsRequired:skillsRequired,
                    experienceLevel:experienceLevel,
                    responsibilities:responsibilities,
                    deadLine:deadLine,
                    employerId:id,
                    company:company,
                    companyEmail:companyEmail,
                    jobTags:tags
                })

                await job.save()
                res.status(200).json({message:"Job Added Successfully"})
        

    }catch(err){
        console.log(err)
        res.status(500).json({message:'Internal Server Error'})
    }
}

const getSingleJob = async(req,res)=>{
    try{
        const {Id} = req.params
        const job = await JobModel.findById(Id).populate('employerId').populate('applicantsId')
        if(!job){
            return res.status(400).json({message:'Job not Found'})
        }
        res.status(200).json(job)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const removeJob = async(req,res)=>{
    try{
        const {Id} = req.params
        const job = await JobModel.findById(Id)
        if(!job){
            return res.status(400).json({message:'Job not Found'})
        }
        await job.deleteOne()
        res.status(200).json({message:"Job removed successfully"})
    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const controlJobStatus = async(req,res)=>{
    try{
        const {Id} = req.params
       
        const {state} = req.body

        const job = await JobModel.findById(Id)
        if(!job){
            return res.status(400).json({message:'Job not Found'})
        }
        job.status = state
        await job.save()
        res.status(200).json({message:"Status Update Successful"})


    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const upDateJob = async(req,res)=>{
    try{
        const {Id} = req.params
        const update =req.body
        const job = await JobModel.findById(Id)
        if(!job){
            return res.status(400).json({message:"Job not Found"})
        }
        Object.assign(job,update)
        await job.save()
        res.status(200).json({message:"Job Updated Successfully"})

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const getAllEmployerProfiles = async(req,res)=>{
    try{
        const employers = await EmployerProfile.find().populate('userId').sort({createdAt:-1})
        res.status(200).json(employers)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const getSingleEmployerProfile = async(req,res)=>{
    try{
        const {Id} = req.params
        const employer = await EmployerProfile.findById(Id).populate('userId')
        .populate('postedJobs')
        if(!employer){
            return res.status(400).json({message:"Employer Profile not Found"})
        }
       
        res.status(200).json(employer)


    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}


const modifyEmployerProfile =async(req,res)=>{
    try{
        const {Id} = req.params
        const update = req.body
       

        const employer = await EmployerProfile.findById(Id)
        if(!employer){
            return res.status(400).json({message:"Employer Profile not Found"})
        }
        Object.assign(employer,update)
        await employer.save()
        res.status(200).json({message:'Employer Profile Update Successfule'})

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const deleteEmployerProfile = async(req,res)=>{
    try{
        const {Id} = req.params
        const employer = await EmployerProfile.findById(Id)
        if(!employer){
            return res.status(400).json({message:"Employer Not Found"})
        }
        await employer.deleteOne()
        res.status(200).json({message:"Employer Profile Removed Successfully"})

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const getAllMiniTasks = async(req,res)=>{
    try{
        const minitasks = await MiniTask.find().populate('employer').sort({createdAt:-1})
        .populate('applicants')
        .populate('assignedTo').sort({createdAt:-1})

        res.status(200).json(minitasks)
    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }

}

const getSingleMinitask = async(req,res)=>{
    try{
        const {Id} = req.params
        const task = await MiniTask.findById(Id).populate('employer')
        .populate('applicants')
        .populate('assignedTo')
         .populate("bids.bidder")
        
        if(!task){
                res.status.status(400).json({message:'Task Not Found'})
        } 
        res.status(200).json(task)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const modifyMiniTaskStatus =async(req,res)=>{
    try{
        const {Id} = req.params
        const {status} =  req.body
        const notificationService = req.app.get("notificationService");
       
        const task = await MiniTask.findById(Id)
        const previousStatus = task.status
        if(!task){
            res.status.status(400).json({message:'Task Not Found'})
        } 
        task.status = status
        await task.save()
        
        await notificationService.sendAdminTaskStatusUpdateNotification({
              clientId: task.employer,
              taskTitle: task.title,
              oldStatus: previousStatus,
              newStatus: task.status,
            });
          res.status(200).json({message:"Task Updated Successfully"})

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const deleteMiniTask = async(req,res)=>{
    try{
        const {Id} = req.params
        const task = await MiniTask.findById(Id)
        if(!task){
            res.status.status(400).json({message:'Task Not Found'})
        } 
        await task.deleteOne()
        res.status(200).json({message:"Task Deleted Successfully"})

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const modifyMiniTask = async(req,res)=>{
    try{
        const {Id} = req.params
        const update = req.body
        const task = await MiniTask.findById(Id)
        if(!task){
            res.status.status(400).json({message:'Task Not Found'})
        } 
        Object.assign(task,update)
        await task.save()
        res.status(200).json({message:'Mini Task Updated Successfully'})


    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}


const fetchAlerts = async(req,res)=>{
    try{
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 10);

        const alerts = await Alert.find({
        createdAt: { $gte: thirtyDaysAgo }
         }).sort({ createdAt: -1 });
         res.status(200).json(alerts)
    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const markAlertsAsRead = async(req,res)=>{
    try{
        const {ids} = req.body
        
        if(!Array.isArray(ids) || ids.length === 0){
           return res.status(400).json({ 
          error: "Invalid input: Expected non-empty array of IDs" 
        });
        }
        await Alert.updateMany( 
         { _id: { $in: ids } },
         {$set: {isRead:true}}

        )
        res.status(200).json({message:"Alerts Marked As read"})

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const markAlertAsRead = async(req,res)=>{
    try{
        const {id} = req.params
       
        
        await Alert.findByIdAndUpdate( id,

         {$set: {isRead:true}}

        )
        res.status(200).json({message:"Alerts Marked As read"})

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}


const getAllTaskers = async(req,res)=>{
    try{
         const taskers = await UserModel.find({role:'job_seeker'}).sort({createdAt:-1})
        
         res.status(200).json(taskers)
    }catch(err){
        console.log(err)
        res.status(500).json({message: "Internal Server Error"})
    }
}


const getTaskerDetails = async(req,res)=>{
     try{
        const {taskerId} = req.params

        const user = await UserModel.findById(taskerId).populate('appliedMiniTasks')
        if(!user){
            return res.status(400).json({message:'User not Found'})
        }
        res.status(200).json(user)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const  updateTaskerStatus = async(req,res)=>{
    try{
        const {taskerId} = req.params
        const update = req.body
        const tasker = await UserModel.findById(taskerId)
        if(!tasker){
            return res.status(404).json({message:'Tasker Not Found'})
        }
        Object.assign(tasker,update)
        await tasker.save()
        res.status(200).json({message:"Tasker updated successfully"})
    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}


const getAllPayments = async(req,res)=>{
    try{
        const payments = await Payment.find()
           .populate('taskId')
           .populate('beneficiary')
           .populate('initiator').sort({createdAt:-1})

        res.status(200).json(payments)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}


const getASinglePayment = async(req,res)=>{
    try{
        const {paymentId} = req.params
        const payment = await Payment.findById(paymentId)
              .populate('taskId')
              .populate('beneficiary')
              .populate('initiator')
        if(!payment){
            return res.status(404).json({message:"Payment not Found."})
        }
       res.status(200).json(payment)

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const modifyPaymentStatus = async(req,res)=>{
    try{
        const {paymentId} = req.params
        const {id} = req.user
        const {status} = req.body
        const payment = await Payment.findById(paymentId)
        if(!payment){
            return res.status(404).json({message:"Payment record not found"})
        }
        payment.status = status
        await payment.save()
        res.status(200).json({message:"Payment status modified successfully"})

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}






module.exports = {adminSignup,adminLogin,adminLogout,adminEditProfile, adminProfile,adminAddUser,modifyUserInfo,getAllEmployerProfiles,
    getAllUsers,getSingleUser, removeUser,getAllJobs,getSingleJob,adminAddJob,controlJobStatus,removeJob,upDateJob,
    getSingleEmployerProfile,modifyEmployerProfile,deleteEmployerProfile,getAllMiniTasks,getSingleMinitask,
    modifyMiniTaskStatus,deleteMiniTask, modifyMiniTask,fetchAlerts,markAlertsAsRead, markAlertAsRead,
    getAllTaskers,getTaskerDetails,updateTaskerStatus,getAllPayments,getASinglePayment,modifyPaymentStatus }
