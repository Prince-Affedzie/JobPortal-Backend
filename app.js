const express = require("express")
const BodyParser = require("body-parser")
const CookieParser = require("cookie-parser")
const mongoose = require("mongoose")
const cors = require('cors')
require("dotenv").config()
const {Server} = require('socket.io')
const http = require('http')
const {JobModel} = require('./Models/JobsModel')

const {userRouter} = require("./Routes/UserRoutes")
const {employerRoute} = require("./Routes/EmpoyerRoutes")
const {adminRouter} = require('./Routes/AdminRoute')
const {seekRouter} = require("./Routes/JobSeekerRoutes")
const {authenticateSocket} = require('./MiddleWare/VerifyToken')
const jobController = require('./Controllers/JobsControllerJobseekers')
const jobControllerEmp = require('./Controllers/JobsControllerEmployers')




const app = express()
app.use(CookieParser())
app.use(BodyParser.urlencoded({extended:true}))
app.use(BodyParser.json())
app.use(express.static("/Static"))
app.use('/Uploads',express.static('Uploads'))

const allowedOrigins = [
  , // use actual Vercel domain
  'http://localhost:3000' // optional, for local dev
];
app.use(cors({
    origin:'https://job-portal-sable-five.vercel.app',
    credentials: true

}))

const server = http.createServer(app)

app.use("/api",userRouter)
app.use("/api",employerRoute)
app.use("/api",seekRouter)
app.use("/api",adminRouter)

mongoose.connect(process.env.DB_URL)
       .then(()=>{
         server.listen(process.env.PORT,()=>{
           
            console.log("Listening on Port 5000")
        })
       })
       .catch((err)=>{
        console.log(err)
       })

const io = new Server(server,{
    cors:{
        origin:'https://job-portal-sable-five.vercel.app',
        credentials:true
    }
})
io.use(authenticateSocket)

io.on('connection',(socket)=>{
    const userId = socket.user.id
    console.log('Someone joined the connection')
    socket.join(userId)

    socket.on('disconnect',()=>{
        console.log("User Disconnected")
    })

})

jobController.setSocketIO(io)
jobControllerEmp.setSocketInstance(io)

