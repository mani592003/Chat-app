// src/pages/AuthModal.js
import React, { useState } from "react";
import axios from "axios";
import "./AuthModal.css"; 

// ✅ Add the new 'onGuestLogin' prop
export default function AuthModal({ onAuthSuccess, onGuestLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // ✅ --- NEW: State for guest login ---
  const [guestName, setGuestName] = useState("");
  const [guestError, setGuestError] = useState("");
  // ------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); 
    if (!username || !password) {
      setError("Username and password are required.");
      return;
    }

    //const url = isLogin
      //? "http://localhost:5000/api/auth/login"
      //: "http://localhost:5000/api/auth/register";
      const url = isLogin
      ? "https://chat-app-server-iupy.onrender.com/api/auth/login"
      : "https://chat-app-server-iupy.onrender.com/api/auth/register";
      
    try {
      if (isLogin) {
        const res = await axios.post(url, { username, password });
        onAuthSuccess(res.data);
      } else {
        await axios.post(url, { username, password });
        alert("Registration successful! Please log in.");
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || (isLogin ? "Login failed" : "Registration failed"));
    }
  };

  // ✅ --- NEW: Handler for guest form submit ---
  const handleGuestSubmit = (e) => {
    e.preventDefault();
    setGuestError("");
    if (!guestName.trim()) {
      setGuestError("Please enter a name.");
      return;
    }
    // Call the new prop function from Chat.js
    onGuestLogin(guestName.trim());
  };
  // --------------------------------------------

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        
        {/* --- LOGIN/REGISTER FORM (No changes here) --- */}
        <h2>{isLogin ? "Login" : "Register"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="auth-button">
            {isLogin ? "Login" : "Register"}
          </button>
        </form>
        <p className="toggle-auth">
          {isLogin ? "Need an account?" : "Already have an account?"}
          <button onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Register" : "Login"}
          </button>
        </p>

        {/* ✅ --- NEW GUEST LOGIN SECTION --- */}
        <hr className="divider" />
        <div className="guest-login-section">
          <h3>Or Join as a Guest</h3>
          <form onSubmit={handleGuestSubmit}>
            <div className="form-group">
              <label htmlFor="guestName">Enter your name</label>
              <input
                type="text"
                id="guestName"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="E.g., Guest123"
              />
            </div>
            {guestError && <p className="error-message">{guestError}</p>}
            <button type="submit" className="auth-button guest-button">
              Join as Guest
            </button>
          </form>
        </div>
        {/* ---------------------------------- */}
  
      </div>
    </div>
  );
}
