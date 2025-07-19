const authenticateSocketConnection=(socket,next)=>{
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
module.exports = {authenticateSocketConnection}