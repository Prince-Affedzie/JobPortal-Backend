const mongoose = require("mongoose");


const userSchema = new mongoose.Schema({
    name: { type: String, required: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String },
    phone: { type: String, unique: true, index: true },
    role: { 
        type: String, 
        enum: ["tasker", "employer", "client", "admin"], 
        required: true 
    },
    profileImage: String,
    pushToken: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    appleId:{type: String},
    idCard:String,
    taskerProfile: { type: mongoose.Schema.Types.ObjectId, ref: "TaskerProfile" }
}, { timestamps: true });

const UserModel = mongoose.model("User",userSchema)

module.exports = {UserModel}