// models/ConversationRoom.js
const mongoose = require('mongoose');

const ConversationRoomSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }
  ],

  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MiniTask', // or 'MiniTask' depending on your system
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  lastMessage: {
    type: String,
  },
  
  lastMessageAt: {
    type: Date,
  },
  unreadCount:{
    type: Number,
    default:0
  }
}, { timestamps: true });

module.exports = mongoose.model('ConversationRoom', ConversationRoomSchema);
