const jwt = require("jsonwebtoken")
const cookie = require('cookie')

const verify_token = async(req,res,next)=>{
    try{
        const {token} = req.cookies
        if (!token){
            return res.status(403).json({message:"No token Provided"})
        }
        const decoded = jwt.verify(token,process.env.token)
        req.user = decoded
        next()

    }catch(err){
        console.log(err)
        res.status(500).json({message:"Internal Server Error"})
    }
}



module.exports = {verify_token}