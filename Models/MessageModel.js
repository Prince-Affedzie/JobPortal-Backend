// models/Message.js
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
   room: { type: mongoose.Schema.Types.ObjectId, ref: 'ConversationRoom', required: true },
   sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
   type: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text',
  },
  text: { type: String },
  mediaUrl: { type: String },
  fileName: { type: String },
  fileKey: {type: String},
  isApprovedForDownload: { type: Boolean, default: false },

  // Message Schema (MongoDB - Mongoose)
 replyTo: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Message',
  default: null
},

  timestamp: { type: Date, default: Date.now },
  seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deleted: {
  type: Boolean,
  default: false,
},

},{ timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
