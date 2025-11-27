// Sockets/messagingSocket.js
const Message = require('../Models/MessageModel');
const ConversationRoom = require('../Models/ConversationRoom');
const onlineUsers = new Map();

function socketHandler(io, socket) {
  

  socket.on('joinRoom', ({ roomId }) => {
    socket.join(roomId);
  });

  socket.on('sendMessage', async (data) => {
    try {
     
      const { senderId, roomId, text, mediaUrl, fileName,replyTo } = data;
      const message =  new Message({
        sender: senderId,
        room: roomId,
        text,
        mediaUrl,
        fileName,
        replyTo
      });
       const savedMessage = await message.save()


      const room = await ConversationRoom.findById(roomId).populate('participants','name profileImage').populate('job','title');

    // Update lastMessage and increment unreadCounts
      const updatedCounts = new Map(room.unreadCounts || []);
      for (let participant of room.participants) {
      const userId = participant._id.toString();
      if (userId !== senderId) {
        const current = updatedCounts.get(userId) || 0;
        updatedCounts.set(userId, current + 1);
      }
    }

     room.lastMessage = message.text || fileName || 'Media sent';
     room.lastMessageAt = new Date();
     room.unreadCounts = updatedCounts;

      await room.save();
     
      const populatedMessage = await Message.findById(savedMessage._id).populate('sender').populate({ path: 'replyTo', populate: { path: 'sender' } });
      io.to(roomId).emit('receiveMessage', populatedMessage);
      io.emit('updatedRoom',room)
    } catch (error) {
      console.error('Socket sendMessage error:', error);
    }
  });

 socket.on('markAsSeen', async ({ messageId, userId }) => {
    try {
      
      const message = await Message.findByIdAndUpdate(
        messageId,
        { $addToSet: { seenBy: userId } },
        { new: true }
      );

      if (!message) {
        console.error('Message not found:', messageId);
        return;
      }

      // Get the updated room with populated data
      const room = await ConversationRoom.findById(message.room)
        .populate('participants', 'name profileImage')
        .populate('job', 'title');

      if (room) {
        // Reset unread count for this user
        room.unreadCounts.set(userId, 0);
        await room.save();
        // Emit consistent data structure
        io.to(message.room.toString()).emit('messageSeen', {
          messageId,
          userId,
          roomId: room._id
        });

        // Also emit updated room to sync room list
        io.emit('updatedRoom', room);
      }
    } catch (error) {
      console.error('Mark as seen error:', error);
    }
  });

    socket.on('deleteMessage', async ({ messageId, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      if (message.sender.toString() !== userId) {
        console.warn('Unauthorized delete attempt');
        return;
      }

      message.deleted = true;
      await message.save();

      io.to(message.room.toString()).emit('messageDeleted', { messageId });

    } catch (error) {
      console.error('deleteMessage error:', error);
    }
  });
  
  // Receive typing
  socket.on('typing', ({ roomId, userId }) => {
    socket.to(roomId).emit('userTyping', { userId });
  });

  // Receive stop typing
  socket.on('stopTyping', ({ roomId, userId }) => {
    socket.to(roomId).emit('userStopTyping', { userId });
  });



  socket.on('approveMessageFile', async ({ messageId }) => {
    try {
      const updatedMessage = await Message.findByIdAndUpdate(
        messageId,
        { isApprovedForDownload: true },
        { new: true }
      );
      io.to(updatedMessage.room.toString()).emit('fileApproved', updatedMessage);
    } catch (error) {
      console.error('File approval error:', error);
    }
  });

  socket.on('user-online', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('update-online-users', Array.from(onlineUsers.keys()));
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

     for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit('update-online-users', Array.from(onlineUsers.keys()));
  });
}

module.exports = { socketHandler };
