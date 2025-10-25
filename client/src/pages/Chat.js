import "./Chat.css";
import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import EmojiPicker from "emoji-picker-react";
import AuthModal from "./AuthModal";
import LobbyModal from "./LobbyModal";

//const socket = io("http://localhost:5000");//
// Use https if your Render URL starts with https
const socket = io("https://chat-app-server-iupy.onrender.com");

const getRandomColor = () => {
  const colors = ["#FF6B6B", "#6BCB77", "#4D96FF", "#FFD93D", "#AA96DA", "#F67280", "#45CB85"];
  return colors[Math.floor(Math.random() * colors.length)];
};

export default function Chat() {
  // User & Room State
  const [currentUser, setCurrentUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [activeRoomCount, setActiveRoomCount] = useState(0);
  const [myRooms, setMyRooms] = useState([]); // ✅ NEW CODE

  // Chat State
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [userColors, setUserColors] = useState({});

  const typingTimeout = useRef(null);
  const chatBoxRef = useRef(null);

  // ✅ Check for logged-in user on load
  useEffect(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    if (token && username) {
      setCurrentUser(username);
    }
  }, []);

  // ✅ Socket event listeners
  useEffect(() => {
    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err.message);
    });

    socket.on("room-joined", ({ roomId, messages }) => {
      console.log(`✅ Joined room: ${roomId}`);
      setRoom(roomId);
      setChat(messages);
    });

    socket.on("room-error", (errorMessage) => {
      console.error("❌ Room error:", errorMessage);
      alert(errorMessage);
    });

    socket.on("receive-message", (msg) => setChat((prev) => [...prev, msg]));

    socket.on("message-deleted", (messageId) => {
      setChat((prev) => prev.filter((msg) => msg._id !== messageId));
    });

    socket.on("typing", (user) => setTypingUser(user));
    socket.on("stop-typing", () => setTypingUser(null));

    socket.on("active-users", (users) => {
      setActiveUsers(users);
      setUserColors((prevColors) => {
        const updated = { ...prevColors };
        users.forEach((u) => {
          if (!updated[u]) updated[u] = getRandomColor();
        });
        return updated;
      });
    });

    socket.on("room-count-update", (count) => {
      setActiveRoomCount(count);
    });

    socket.on("my-rooms-list", (rooms) => {
      console.log("Received my rooms:", rooms);
      setMyRooms(rooms);
    });

    // ✅ NEW CODE: Kick event
    socket.on("room-kicked", (message) => {
      alert(message);
      setRoom(null);
      setChat([]);
      setActiveUsers([]);
    });

    // ✅ Handle disconnects
    socket.on("disconnect", (reason) => {
      console.warn(`Socket disconnected: ${reason}. Returning to lobby.`);
      alert("You were disconnected. Returning to the lobby.");
      setRoom(null);
      setChat([]);
      setActiveUsers([]);
    });

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("room-joined");
      socket.off("room-error");
      socket.off("receive-message");
      socket.off("message-deleted");
      socket.off("typing");
      socket.off("stop-typing");
      socket.off("active-users");
      socket.off("room-count-update");
      socket.off("my-rooms-list");
      socket.off("room-kicked");
      socket.off("disconnect");
    };
  }, []);

  // ✅ Auto-scroll chat box
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chat]);

  // ✅ --- Fetch user's rooms when in lobby ---
  useEffect(() => {
    if (currentUser && !room) {
      if (!currentUser.endsWith("(Guest)")) {
        console.log("Fetching rooms for registered user:", currentUser);
        socket.emit("get-my-rooms", currentUser);
      } else {
        setMyRooms([]);
      }
    }
  }, [currentUser, room]);

  // --- Authentication and Lobby Handlers ---
  const handleAuthSuccess = (authData) => {
    localStorage.setItem("token", authData.token);
    localStorage.setItem("username", authData.user.username);
    setCurrentUser(authData.user.username);
  };

  // ✅ Guest login handler
  const handleGuestLogin = (guestName) => {
    const finalName = `${guestName} (Guest)`;
    localStorage.setItem("username", finalName);
    setCurrentUser(finalName);
  };

  const handleCreateRoom = () => {
    if (currentUser) {
      socket.emit("create-room", currentUser);
    }
  };

  const handleJoinRoom = (roomId) => {
    if (currentUser && roomId) {
      socket.emit("join-room", { username: currentUser, roomId });
    }
  };

  // ✅ Delete room (only for registered users)
  const handleDeleteRoom = (roomId) => {
    if (
      window.confirm(
        `Are you sure you want to permanently delete room ${roomId}? This will erase all messages for everyone.`
      )
    ) {
      if (currentUser && !currentUser.endsWith("(Guest)")) {
        socket.emit("delete-room", { roomId, username: currentUser });
      } else {
        alert("Guests are not allowed to delete rooms.");
      }
    }
  };

  // --- Logout ---
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setCurrentUser(null);
    setRoom(null);
    setChat([]);
  };

  // --- Typing & Emoji ---
  const onEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    socket.emit("typing", currentUser);

    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("stop-typing");
    }, 1000);
  };

  const sendMessage = () => {
    if (!message.trim()) return;

    const msgObj = {
      sender: currentUser,
      text: message,
    };

    socket.emit("send-message", msgObj);
    setMessage("");
    socket.emit("stop-typing");
  };

  const handleDeleteMessage = (messageId) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      socket.emit("delete-message", messageId);
    }
  };

  // --- UI Render ---
  return (
    <div className="chat-page-wrapper">
      {/* 1️⃣ Show Auth Modal if not logged in */}
      {!currentUser && (
        <AuthModal onAuthSuccess={handleAuthSuccess} onGuestLogin={handleGuestLogin} />
      )}

      {/* 2️⃣ Show Lobby Modal if logged in BUT not in a room */}
      {currentUser && !room && (
        <LobbyModal
          username={currentUser}
          handleCreateRoom={handleCreateRoom}
          handleJoinRoom={handleJoinRoom}
          handleDeleteRoom={handleDeleteRoom} // ✅ NEW CODE
          activeRoomCount={activeRoomCount}
          myRooms={myRooms}
        />
      )}

      {/* 3️⃣ Chat Interface */}
      <div className={`chat-container ${!currentUser || !room ? "blurred" : ""}`}>
        <h2 className="chat-title">💬 Welcome, {currentUser || "Guest"}</h2>

        {currentUser && (
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        )}

        {room && (
          <div className="room-info">
            <h3>
              Room ID: <strong>{room}</strong>
            </h3>
          </div>
        )}

        <div className="active-users">
          <h4>👥 Active Members ({activeUsers.length}):</h4>
          <ul className="member-list">
            {activeUsers.map((user, index) => (
              <li key={index} className="member-name">
                {user}
              </li>
            ))}
          </ul>
        </div>

        <div className="chat-box" ref={chatBoxRef}>
          {chat.map((msg) => (
            <div
              key={msg._id || Math.random()}
              className={`chat-message ${msg.sender === currentUser ? "me" : ""}`}
            >
              {/* Delete button for your own messages */}
              {msg.sender === currentUser && (
                <button className="delete-btn" onClick={() => handleDeleteMessage(msg._id)}>
                  ✕
                </button>
              )}

              <div className="chat-message-header">
                <strong style={{ color: userColors[msg.sender] || "#000" }}>
                  {msg.sender}
                </strong>
                <span className="chat-timestamp">
                  {msg.timestamp
                    ? new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>
              </div>
              <div>{msg.text}</div>
            </div>
          ))}
        </div>

        {typingUser && typingUser !== currentUser && (
          <p className="typing-indicator">✍️ {typingUser} is typing...</p>
        )}

        <div className="chat-input-container">
          <input
            className="chat-input"
            value={message}
            onChange={handleTyping}
            placeholder="Type your message..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button className="chat-button" onClick={() => setShowEmojiPicker((prev) => !prev)}>
            😊
          </button>
          <button className="chat-button" onClick={sendMessage}>
            Send
          </button>
        </div>

        {showEmojiPicker && (
          <div style={{ position: "absolute", bottom: "80px", right: "20px", zIndex: 10 }}>
            <EmojiPicker onEmojiClick={onEmojiClick} />
          </div>
        )}
      </div>
    </div>
  );
}
