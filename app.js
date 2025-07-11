const express = require("express")
const BodyParser = require("body-parser")
const CookieParser = require("cookie-parser")
const mongoose = require("mongoose")
const cors = require('cors')
require("dotenv").config()
const {Server} = require('socket.io')
const http = require('http')
const {JobModel} = require('./Models/JobsModel')
const { UserModel } = require( "./Models/UserModel")
const {MiniTask} =require("./Models/MiniTaskModel")
const ConversationRoom = require('./Models/ConversationRoom');
const EmployerProfile = require('./Models/EmployerProfile')


const {userRouter} = require("./Routes/UserRoutes")
const {employerRoute} = require("./Routes/EmpoyerRoutes")
const {adminRouter} = require('./Routes/AdminRoute')
const {seekRouter} = require("./Routes/JobSeekerRoutes")
const {submissionRoute} = require("./Routes/WorkSubmissionRoute")
const {chatMessagingRoute} =require('./Routes/MessageChatRoute')
const {disputeRouter} = require('./Routes/DisputeRoute')
const {authenticateSocket} = require('./MiddleWare/VerifyToken')
const jobController = require('./Controllers/JobsControllerJobseekers')
const jobControllerEmp = require('./Controllers/JobsControllerEmployers')
const WorkSubmissionController  = require("./Controllers/WorkSubmissionController")
const disputeController = require("./Controllers/DisputeController")
const {socketHandler} = require('./Utils/messagingSocketHandler')


const app = express()
app.use(CookieParser())
app.use(BodyParser.urlencoded({extended:true}))
app.use(BodyParser.json())
app.use(express.static("/Static"))
app.use('/Uploads',express.static('Uploads'))
app.set('trust proxy', 1);
const allowedOrigins = [
  , // use actual Vercel domain
  'http://localhost:3000' // optional, for local dev
  //https://job-portal-sable-five.vercel.app/
];
app.use(cors({
    origin:process.env.Frontend_Url,
    credentials: true

}))

const server = http.createServer(app)



mongoose.connect(process.env.DB_URL)
       .then(()=>{
         server.listen(process.env.PORT || 5000,()=>{
          
           
            console.log("Listening on Port 5000")
        })
       })
       .catch((err)=>{
        console.log(err)
       })

const io = new Server(server,{
    cors:{
        origin:process.env.Frontend_Url,
        credentials:true,
        methods: ['GET', 'POST']
    }
})
io.use(authenticateSocket)

io.on('connection',(socket)=>{
    const userId = socket.user.id
    console.log('Someone joined the connection')
    socket.join(userId)
    socketHandler(io,socket)

    socket.on('disconnect',()=>{
        console.log("User Disconnected")
    })

})

app.use("/api",userRouter)
app.use("/api",employerRoute)
app.use("/api",seekRouter)
app.use("/api",adminRouter)
app.use("/api",submissionRoute)
app.use("/api",chatMessagingRoute)
app.use("/api",disputeRouter)

app.options('*', cors());

jobController.setSocketIO(io)
disputeController.setSocketIO(io)
jobControllerEmp.setSocketInstance(io)
WorkSubmissionController.setSocketIO(io)


