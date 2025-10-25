// models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    sender: {
    type: String,
    required: true
    },
    text: {
    type: String,
    required: true
    },
    room: { // <-- ADD THIS
    type: String,
    required: true
 },
timestamp: {
    type: Date,
    default: Date.now
    }
});

module.exports = mongoose.model("Message", messageSchema);