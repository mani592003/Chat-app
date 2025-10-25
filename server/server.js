// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const Message = require("./models/Message");

const app = express();
const server = http.createServer(app);
//const io = new Server(server, {
  //cors: {
  //  origin: "http://localhost:3000",
 //   credentials: true,
 // },
//});

//app.use(cors());
//app.use(express.json());
// server.js
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "https://chat-app-taupe-nine-89.vercel.app/", // Allow deployed URL or localhost
    credentials: true,
  },
});

// Also update the Express CORS middleware if needed (optional but good practice)
app.use(cors({ 
  origin: process.env.CLIENT_URL || "https://chat-app-taupe-nine-89.vercel.app/", 
  credentials: true 
}));

// 🌐 Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// 🔐 Auth routes
app.use("/api/auth", authRoutes);

// ✅ In-memory store for socket data
const socketData = new Map(); // socket.id => { username, room }

// ✅ --- HELPER FUNCTIONS ---

// Get list of active users in a specific room
const getActiveUsersInRoom = (roomId) => {
  const users = [];
  for (const [socketId, data] of socketData.entries()) {
    if (data.room === roomId) {
      users.push(data.username);
    }
  }
  return [...new Set(users)];
};

// Count real (non-socket) rooms
const getActiveRoomCount = () => {
  const rooms = io.sockets.adapter.rooms;
  let count = 0;
  for (const [roomId, sockets] of rooms.entries()) {
    // Room IDs that are not individual socket IDs represent actual rooms
    if (!io.sockets.sockets.has(roomId)) {
      count++;
    }
  }
  return count;
};

// Broadcast room count to all connected clients
const broadcastRoomCount = () => {
  io.emit("room-count-update", getActiveRoomCount());
};

// ------------------------------

// 🔌 Socket.IO real-time communication
io.on("connection", (socket) => {
  console.log("🔗 User connected:", socket.id);

  // Send the current room count to the new user
  socket.emit("room-count-update", getActiveRoomCount());

  // ✅ 1. Handle user creating a new private room
  socket.on("create-room", (username) => {
    const roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
    console.log(`👤 ${username} created and joined room: ${roomId}`);

    socket.join(roomId);
    socketData.set(socket.id, { username, room: roomId });

    socket.emit("room-joined", { roomId, messages: [] });
    io.to(roomId).emit("active-users", getActiveUsersInRoom(roomId));

    broadcastRoomCount();
  });

  // ✅ 2. Handle user joining an existing room
  socket.on("join-room", async ({ username, roomId }) => {
    // const roomExists = io.sockets.adapter.rooms.has(roomId);//
    // if (!roomExists) {//
    //   socket.emit("room-error", "Room not found. Please check the ID.");//
    //   return;//
    // }

    console.log(`👤 ${username} joined room: ${roomId}`);
    socket.join(roomId);
    socketData.set(socket.id, { username, room: roomId });

    try {
      const messages = await Message.find({ room: roomId })
        .sort({ timestamp: 1 })
        .limit(50);
      socket.emit("room-joined", { roomId, messages });
      io.to(roomId).emit("active-users", getActiveUsersInRoom(roomId));
    } catch (err) {
      console.error("❌ Failed to load messages:", err.message);
    }
  });

  // ✅ 3. Handle request for user's past rooms
  socket.on("get-my-rooms", async (username) => {
    // This only works for non-guest users
    if (username.endsWith("(Guest)")) {
      socket.emit("my-rooms-list", []); // Send empty list for guests
      return;
    }

    try {
      // Find all unique 'room' IDs where the 'sender' was this user
      const rooms = await Message.distinct("room", { sender: username });
      socket.emit("my-rooms-list", rooms);
    } catch (err) {
      console.error("❌ Error fetching user rooms:", err.message);
      socket.emit("my-rooms-list", []); // Send empty on error
    }
  });
  
  // ✅ 4. Handle delete room request
  socket.on("delete-room", async ({ roomId, username }) => {
    // 1. Check if user is a guest
    if (username.endsWith("(Guest)")) {
      socket.emit("room-error", "Guests are not allowed to delete rooms.");
      return;
    }

    try {
      // 2. Delete all messages associated with the room
      await Message.deleteMany({ room: roomId });

      console.log(`🗑️ Room ${roomId} deleted by ${username}`);

      // 3. Kick any users currently in that room
      // They will get an alert and be sent to the lobby
      io.to(roomId).emit("room-kicked", `This room (${roomId}) was deleted by a user.`);
      
      // 4. Update the active room count for all clients
      broadcastRoomCount();

      // 5. Tell the user who deleted it to refresh their list
      socket.emit("get-my-rooms", username);

    } catch (err) {
      console.error("❌ Error deleting room:", err.message);
      socket.emit("room-error", "An error occurred while deleting the room.");
    }
  });

  // 💬 5. Handle new message (Comment number updated)
  socket.on("send-message", async (msgObj) => {
    const { room } = socketData.get(socket.id) || {};

    if (!room) {
      console.log(
        `❌ Message from ${msgObj.sender} rejected: not in a room (socket ${socket.id}).`
      );
      return;
    }

    try {
      const savedMessage = new Message({
        sender: msgObj.sender,
        text: msgObj.text,
        room,
        timestamp: new Date(),
      });

      await savedMessage.save();
      io.to(room).emit("receive-message", savedMessage);
    } catch (err) {
      console.error("❌ Error saving message:", err.message);
    }
  });

  // 🗑️ 6. Handle delete message (Comment number updated)
  socket.on("delete-message", async (messageId) => {
    const { room } = socketData.get(socket.id) || {};
    if (!room) return;

    try {
      await Message.findByIdAndDelete(messageId);
      io.to(room).emit("message-deleted", messageId);
    } catch (err) {
      console.error("❌ Error deleting message:", err.message);
    }
  });

  // ✍️ 7. Handle typing events (Comment number updated)
  socket.on("typing", (username) => {
    const { room } = socketData.get(socket.id) || {};
    if (room) {
      socket.broadcast.to(room).emit("typing", username);
    }
  });

  socket.on("stop-typing", () => {
    const { room } = socketData.get(socket.id) || {};
    if (room) {
      socket.broadcast.to(room).emit("stop-typing");
    }
  });

  // ❌ 8. Handle disconnect (Comment number updated)
  socket.on("disconnect", () => {
    console.log("🔌 User disconnected:", socket.id);
    const data = socketData.get(socket.id);

    if (data) {
      const { username, room } = data;
      socketData.delete(socket.id);

      io.to(room).emit("active-users", getActiveUsersInRoom(room));
      console.log(`👤 ${username} left room: ${room}`);

      const roomUsers = io.sockets.adapter.rooms.get(room);
      if (!roomUsers || roomUsers.size === 0) {
        broadcastRoomCount();
      }
    }
  });
});

// 🚀 Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
