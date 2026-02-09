const express = require("express")
const BodyParser = require("body-parser")
const slugify = require("slugify");
const CookieParser = require("cookie-parser")
const mongoose = require("mongoose")
const cors = require('cors')
require("dotenv").config()
const {Server} = require('socket.io')
const http = require('http')
const {JobModel} = require('./Models/JobsModel')
const { UserModel } = require( "./Models/UserModel")
const {ServiceCategory} = require('./Models/ServiceCategory')
const {MiniTask} =require("./Models/MiniTaskModel")
const ConversationRoom = require('./Models/ConversationRoom'); 
const EmployerProfile = require('./Models/EmployerProfile')
const {NotificationModel} = require('./Models/NotificationModel')
const {Service} = require('./Models/ServiceModel')



const {userRouter} = require("./Routes/UserRoutes")
const {employerRoute} = require("./Routes/EmpoyerRoutes")
const {adminRouter} = require('./Routes/AdminRoute')
const {AdminMinitaskRouter} = require('./Controllers/AdminMicroTaskController')
const {seekRouter} = require("./Routes/JobSeekerRoutes")
const {submissionRoute} = require("./Routes/WorkSubmissionRoute")
const {chatMessagingRoute} =require('./Routes/MessageChatRoute')
const {disputeRouter} = require('./Routes/DisputeRoute')
const {taskerRouter} = require('./Routes/TaskerRoute')
const {clientRouter} = require('./Routes/ClientRoute')
const {commonRouter} = require('./Routes/CommonRoute')
const {ratingRouter} = require('./Routes/RatingRoute')
const {paymentRouter} = require('./Routes/PaymentRoute')
const {adminUsersMonitoringRoute} = require('./Routes/AdminUserMonitoringRoute')
const {twilioRouter} = require('./Controllers/twilioResetController')
const {clientServiceRouter} = require('./AgencyBaseRoutes/clientServiceRoute')
const {taskerServiceRouter} = require('./AgencyBaseRoutes/taskerServiceRoute')
const {serviceRouter} = require('./Routes/ServicesRoute')
const  {geocodeAddress} = require('./Utils/geoService')




const {authenticateSocketConnection} = require('./Validators/authenticateSocketConnection')
const jobController = require('./Controllers/CommonController')
const jobControllerEmp = require('./Controllers/JobsControllerEmployers')
const WorkSubmissionController  = require("./Controllers/WorkSubmissionController")
const disputeController = require("./Controllers/DisputeController")
const {socketHandler} = require('./Services/messagingService')
const NotificationService = require('./Services/notificationService');
const {initAdminSocketIO} = require('./Config/adminSocketIO');

const app = express()
app.use(CookieParser())
app.use(BodyParser.urlencoded({extended:true}))
app.use(BodyParser.json())
app.use(express.static("/Static"))
app.use('/Uploads',express.static('Uploads'))
app.set('trust proxy', 1);

app.use(cors({
    origin:true,
    credentials: true

}))


const runMigrations = async () => {
    try {
      await UserModel.updateMany(
        {}, 
        { $set: { credits: 12} }
      );
      console.log('All users updated with default verification status');
    } catch (err) {
      console.error('Error during migration:', err);
    }
  };



 
const server = http.createServer(app)

mongoose.connect(process.env.DB_URL,
    {
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      socketTimeoutMS: 45000, 
      connectTimeoutMS: 30000,
      serverSelectionTimeoutMS: 5000, 
      retryWrites: true,
      retryReads: true,
    }
)
       .then(()=>{
         server.listen(process.env.PORT || 5000,()=>{
         console.log("Listening on Port 5000")
         
        })
       })
       .catch((err)=>{
        console.log(err)
       })


 mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });


 mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

const io = new Server(server,{
    cors:{
        origin:process.env.Frontend_Url,
        credentials:true,
        methods: ['GET', 'POST']
    }
})

const { broadcastAdminAlert } = initAdminSocketIO(io);
require('./Services/adminEventService').setBroadcaster(broadcastAdminAlert);
app.set('broadcastAdminAlert', broadcastAdminAlert);
io.use(authenticateSocketConnection)
const notificationService = new NotificationService(io);

io.on('connection',(socket)=>{
    const userId = socket.user.id
    console.log('Someone joined the connection')
    socket.join(userId)
    socketHandler(io,socket,notificationService)

    socket.on('disconnect',()=>{
        console.log("User Disconnected")
    })

})

app.use("/api",userRouter)
app.use("/api",employerRoute)
//app.use("/api",seekRouter)
app.use("/api",adminRouter)
app.use("/api",submissionRoute)
app.use("/api",chatMessagingRoute)
app.use("/api",disputeRouter)
app.use("/api",taskerRouter)
app.use("/api",clientRouter)
app.use("/api",commonRouter)
app.use("/api",ratingRouter)
app.use("/api",paymentRouter)
app.use("/api",AdminMinitaskRouter)
app.use("/api",adminUsersMonitoringRoute)
app.use("/api",twilioRouter)
app.use("/api",clientServiceRouter)
app.use("/api",taskerServiceRouter)
app.use("/api",serviceRouter)
app.set('notificationService', notificationService);

app.options('*', cors());

jobController.setSocketIO(io)
disputeController.setSocketIO(io)
jobControllerEmp.setSocketInstance(io)
WorkSubmissionController.setSocketIO(io)




