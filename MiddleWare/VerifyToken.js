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

const authenticateSocket=(socket,next)=>{
    try{
        const cookies = socket.handshake.headers.cookie
        
       
        if(!cookies){
            return next(new Error('No Cookie Found'))
        }

        const parsed = cookie.parse(cookies)
        const token =parsed.token
        if(!token){
            return next(new Error('No token Provided'))
        }
        jwt.verify(token,process.env.token,(err,user)=>{
            if(err)return next(new Error('Authentication Error'))
            socket.user = user
            next()


        })
        

    }catch(err){
        console.log(err)
        return next(new Error("Internal error"));
       
    }
}

module.exports = {verify_token,authenticateSocket}