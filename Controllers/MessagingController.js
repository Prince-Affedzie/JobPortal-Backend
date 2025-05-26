// controllers/messageController.js
const ConversationRoom = require('../Models/ConversationRoom');
const Message = require('../Models/MessageModel');
const {UserModel} = require('../Models/UserModel');
const  cloudinary =require('../Utils/Cloudinary')
const { uploader } = cloudinary; 
const streamifier = require('streamifier');
const { getUploadURL, getPreviewURL, getPublicURL } = require('../Utils/s3')

const handleChatFileUpload = async(req,res)=>{
  try{
    const {id} = req.user
  
    const {filename,contentType} = req.body
    console.log(req.body)
    const fileKey = `chatfiles/${id}/${Date.now()}-${filename}`;
    const fileUrl = await getUploadURL(fileKey,contentType)
    const publicUrl = getPublicURL(fileKey);
    console.log( publicUrl)
    res.status(200).json({fileUrl,fileKey, publicUrl})
    
    }catch(err){
    console.log(err)
    res.status(500).json({message:"Internal Server Error"})
    }
}
// Create or get a chat room
const createOrGetRoom = async (req, res) => {
  const { userId2, jobId, } = req.body;
  const {id} =req.user

  try {
    let room = await ConversationRoom.findOne({
      participants: { $all: [id, userId2], $size: 2 },
       job: jobId || null
     
    }).populate('participants');

    if (!room) {
      room = await ConversationRoom.create({
        participants: [id, userId2],
        job: jobId || null,
      });
    }

   res.status(200).json(room);
  } catch (error) {
    res.status(500).json({ message: 'Error creating or getting room', error });
  }
};

const fetchRoomInfo = async(req,res)=>{
  try{
    const { roomId } = req.params;
    const room = await ConversationRoom.findById(roomId).populate('participants','_id name profileImage').populate('job','title');
    if(!room){
      return res.status(404).json({message:'Room not Found'})
    }
    res.status(200).json(room);

  }catch(err){
    console.log(err)
    res.status(500).json({message:"Internal Server Error"})
  }
}

// Get all messages in a room
const getMessagesByRoom = async (req, res) => {
  const { roomId } = req.params;
  const { limit = 20, cursor } = req.query;
  
  try {
    const query = { room: roomId };
    
    // For pagination: fetch messages older than cursor
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }
    
    console.log(query);
    
    // Always sort by createdAt descending for pagination
    const messages = await Message.find(query)
      .populate({ path: 'replyTo', populate: { path: 'sender' } })
      .populate('sender')
      .sort({ createdAt: -1 }) // Changed to -1 for descending order
      .limit(parseInt(limit));
    
    // Reverse the messages to show chronological order (oldest first)
    const orderedMessages = messages.reverse();
    
    res.status(200).json({
      messages: orderedMessages,
      nextCursor: messages.length > 0 ? messages[0].createdAt : null, // Use first message's timestamp
      hasMore: messages.length === parseInt(limit),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages', error });
  }
};

// Send a message
const sendMessage = async (req, res) => {
  const { senderId, roomId,  text, content, mediaUrl, fileName } = req.body;
  const {id} =req.user

  try {
    const message = new Message({
      sender: id,
      room: roomId,
      text,
      content,
      mediaUrl,
      fileName
    });
    if (req.body.replyTo) {
    message.replyTo = req.body.replyTo;
    }
    await ConversationRoom.findByIdAndUpdate(roomId, { lastMessage: message._id });

     await message.save();
     return message
  } catch (error) {
    res.status(500).json({ message: 'Error sending message', error });
  }
};

const deleteMessage = async(req,res)=>{
  try{
    const {id} = req.user
    const { messageId, userId } = req.body;

  const message = await Message.findById(messageId);
  if (!message) return res.status(404).json({ error: 'Message not found' });

  if (message.sender.toString() !== id.toString()) {
    return res.status(403).json({ error: 'You can only delete your own messages' });
  }

  message.deleted = true;
  await message.save();

  }catch(error){
    console.log(error)
    res.status(500).json({message:"Internal Server Error"})
  }
}

// Approve file for download
const approveMessageFile = async (req, res) => {
  const { messageId } = req.params;

  try {
    const message = await Message.findByIdAndUpdate(
      messageId,
      { isApprovedForDownload: true },
      { new: true }
    );

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Error approving file', error });
  }
};

// Mark message as read
const markAsRead = async (req, res) => {
  const { messageId } = req.params;
  const { userId } = req.body;

  try {
    const message = await Message.findByIdAndUpdate(
      messageId,
      { $addToSet: {  seenBy: userId } },
      { new: true }
    );

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Error marking message as read', error });
  }
};

const fetchRooms = async(req,res)=>{
  try{
    const {id} = req.user
    const rooms = await ConversationRoom.find({ participants:{$in:id}}).populate('participants','name profileImage').populate('job','title').sort({lastMessageAt:-1})
    res.status(200).json(rooms)

  }catch(err){
         console.log(err)
         res.status(500).json({message:"Internal Server Error"})
  }
}

module.exports ={ createOrGetRoom,getMessagesByRoom,sendMessage,approveMessageFile,markAsRead,
  fetchRooms,handleChatFileUpload,deleteMessage,fetchRoomInfo }
