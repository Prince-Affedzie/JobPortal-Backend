const {UserModel} = require("../Models/UserModel")
const EmployerProfile = require('../Models/EmployerProfile')

const verifyEligibility = async(req,res,next)=>{
    try{

        const {id,role} = req.user
       
        const user = await EmployerProfile.findOne({userId:id})
        
        if(!user || user.isVerified === false || role === 'job_seeker'){
            return res.status(403).json({message:"You are not Verified to Post Jobs. Please Verify Your Business Profile"})
        }

        next()

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const verifyMiniTaskPostings = async(req,res,next)=>{
    try{
        const {id,role} = req.user
        const user  = await UserModel.findById(id)
        if(!user || user.miniTaskEligible === false || user.isVerified  === false){
            return res.status(400).json({message:"Please verify your profile before you can post MiniTasks."})
        }
        next()

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}

const verifyAdminRoute = async(req,res,next)=>{
    try{
        const {id} = req.user
        const user = await UserModel.findById(id)
        if(!user || user.role !== 'admin'){
            return res.status(404).json({message:'UnAuthorised Access'})
        }
        next()

    }catch(err){
        console.log(err)
        res.status(500).json({message:'Internal Server Error'})
    }
}

module.exports = {verifyEligibility,verifyMiniTaskPostings,verifyAdminRoute}