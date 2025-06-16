const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const validator = require("validator")
const {UserModel} = require("../Models/UserModel")
const {JobModel} = require('../Models/JobsModel')
const {MiniTask} =require("../Models/MiniTaskModel")
const EmployerProfile = require('../Models/EmployerProfile')

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
        res.cookie("token",token,{httpOnly:true,sameSite:"strict",secure:true})
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

        const user = await UserModel.findById(Id).populate('appliedJobs','title')
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
                console.log(req.body)
        
                
        
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
        console.log(req.body)

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
        console.log(req.body)
        const {status} =  req.body
        const task = await MiniTask.findById(Id)
        if(!task){
            res.status.status(400).json({message:'Task Not Found'})
        } 
        task.status = status
        await task.save()
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



module.exports = {adminSignup,adminLogin,adminLogout,adminEditProfile, adminProfile,adminAddUser,modifyUserInfo,getAllEmployerProfiles,
    getAllUsers,getSingleUser, removeUser,getAllJobs,getSingleJob,adminAddJob,controlJobStatus,removeJob,upDateJob,
    getSingleEmployerProfile,modifyEmployerProfile,deleteEmployerProfile,getAllMiniTasks,getSingleMinitask,
    modifyMiniTaskStatus,deleteMiniTask, modifyMiniTask }
