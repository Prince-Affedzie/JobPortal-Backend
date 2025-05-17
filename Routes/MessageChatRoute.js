const express = require("express")
const chatMessagingRoute = express.Router()
const {upload} = require('../Utils/Mutler')
const {verify_token} = require("../MiddleWare/VerifyToken")

const { createOrGetRoom,getMessagesByRoom,sendMessage,approveMessageFile,
    markAsRead,fetchRooms,handleChatFileUpload,fetchRoomInfo} = require('../Controllers/MessagingController')
chatMessagingRoute.post('/start/chat_room',verify_token, createOrGetRoom)
chatMessagingRoute.get('/get/chat_room_messages/:roomId',verify_token, getMessagesByRoom)
chatMessagingRoute.get('/get/messages/rooms',verify_token,fetchRooms)
chatMessagingRoute.post('/handle/chat_files', verify_token,upload.single('file'),handleChatFileUpload)
chatMessagingRoute.post('/send/message',verify_token,sendMessage)
chatMessagingRoute.get('/get_room_info/:roomId',verify_token,fetchRoomInfo)
module.exports = {chatMessagingRoute}