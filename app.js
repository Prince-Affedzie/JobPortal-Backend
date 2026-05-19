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
const TaskerProfile = require("./Models/TaskerModel");
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


const migrate = async () => {
  try {
    // Update all tasker profiles that are missing the ratingsReceived field
    const result = await TaskerProfile.updateMany(
      { ratingsReceived: { $exists: false } },         // only those without the field
      { $set: { ratingsReceived: [] } }                // set it to an empty array
    );

    console.log(`Migration complete. Modified ${result.modifiedCount} tasker profile(s).`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
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

const io = new Server(server, {
  cors: {
    origin: process.env.Frontend_Url,
    credentials: true,
    methods: ['GET', 'POST']
  },
  // ── Connection reliability settings ───────────────────────────────
  pingTimeout: 60000,        // how long to wait for pong before disconnecting
  pingInterval: 25000,       // how often to ping the client
  connectTimeout: 45000,     // how long to wait for initial connection
  // ── Reconnection ─────────────────────────────────────────────────
  allowEIO3: true,           // allow Engine.IO v3 clients
  transports: ['websocket', 'polling'], // try WebSocket first, fall back to polling
})

const { broadcastAdminAlert } = initAdminSocketIO(io);
require('./Services/adminEventService').setBroadcaster(broadcastAdminAlert);
app.set('broadcastAdminAlert', broadcastAdminAlert);
io.use(authenticateSocketConnection)
const notificationService = new NotificationService(io);

io.on('connection', (socket) => {
  const userId = socket.user?.id;
  
  if (!userId) {
    console.error('Socket connected without user ID – disconnecting');
    socket.disconnect(true);
    return;
  }

  console.log(`✅ User connected: ${userId} (socket: ${socket.id})`);
  socket.join(userId);
  
  // Pass socket to message handler
  socketHandler(io, socket, notificationService);

  // ── Reconnection tracking ────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`❌ User disconnected: ${userId} — Reason: ${reason}`);
    
    // If the disconnection was not intentional (server-side), log it for monitoring
    if (reason === 'transport error' || reason === 'ping timeout') {
      console.warn(`⚠️ Abnormal disconnect for user ${userId}`);
    }
  });

  // Handle explicit reconnection acknowledgment
  socket.on('reconnect_attempt', () => {
    console.log(`🔄 Reconnection attempt for user ${userId}`);
  });
  
  socket.on('error', (err) => {
    console.error(`Socket error for user ${userId}:`, err.message);
  });
});


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




