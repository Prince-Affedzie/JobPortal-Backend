
const sendSingleUserNotification = async(req,res)=>{
    const notificationService = req.app.get("notificationService");
    try{
        const {userId} = req.params
        const{title,message} =req.body
        // adminNotifyUser
        await  notificationService.adminNotifyUser({userId,title,message})
        res.status(200).json({message:'Notification sent sucessfully'})

    }catch(err){
         res.status(500).json({message:"Internal Server Error"})
        console.log(err)
    }
}

const broadCastNotification = async(req,res)=>{
    const notificationService = req.app.get("notificationService");
    //adminBroadcastNotification
    try{
        const {title,message} = req.body
        await notificationService.adminBroadcastNotification({title,message})
        res.status(200).json({message:'Notification sent sucessfully'})

    }catch(err){
        res.status(500).json({message:"Internal Server Error"})
        console.log(err)
    }
}

const sendRoleBasedNotification = async(req,res)=>{
    const notificationService = req.app.get("notificationService");
    //adminNotifyUsersByRole
    try{
        const {role,title,message} = req.body
        await notificationService.adminNotifyUsersByRole({role,title,message})
        res.status(200).json({message:'Notification sent sucessfully'})

    }catch(err){
        res.status(500).json({message:"Internal Server Error"})
        console.log(err)
    }
}

module.exports = {sendRoleBasedNotification ,broadCastNotification,sendSingleUserNotification}