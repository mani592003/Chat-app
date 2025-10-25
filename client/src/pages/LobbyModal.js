// src/pages/LobbyModal.js
import React, { useState } from "react";
import "./AuthModal.css"; // We can reuse the same CSS

export default function LobbyModal({ 
  username, 
  handleCreateRoom, 
  handleJoinRoom, 
  activeRoomCount, 
  myRooms,
  handleDeleteRoom 
}) {
  const [joinRoomId, setJoinRoomId] = useState("");

  const onJoinSubmit = (e) => {
    e.preventDefault();
    if (joinRoomId.trim()) {
      handleJoinRoom(joinRoomId.trim().toUpperCase());
    }
  };

  const joinFromList = (roomId) => {
    handleJoinRoom(roomId);
  };

  // Helper for the delete button
  const deleteFromList = (roomId) => {
    handleDeleteRoom(roomId);
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content lobby-modal">
        {/* THIS IS THE LINE THAT WAS MISSING */}
        <h2>Welcome, {username}!</h2> 
        
        <p>Create a private chat room or join one using an ID.</p>
        <p className="room-count">
          <strong>{activeRoomCount}</strong> {activeRoomCount === 1 ? 'room' : 'rooms'} active
        </p>

        <button className="chat-button create-room-btn" onClick={handleCreateRoom}>
          Create Private Room
        </button>
      
        <hr className="divider" />
      
        <form onSubmit={onJoinSubmit} className="join-form">
          <label htmlFor="roomId">Join a Room</label>
          <input
            id="roomId"
            className="chat-input"
            type="text"
            placeholder="Enter Room ID"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
          />
          <button className="chat-button" type="submit">
            Join Room
          </button>
        </form>

        {/* "MY ROOMS" SECTION */}
        {myRooms && myRooms.length > 0 && (
          <div className="my-rooms-section">
            <hr className="divider" />
            <h3>Your Previous Rooms</h3>
            <div className="my-rooms-list">
              {myRooms.map((room) => (
                <div key={room} className="room-list-item">
                  <button 
                    className="room-list-join-btn"
                    onClick={() => joinFromList(room)}
                  >
                    {room}
                  </button>
                  <button 
                    className="room-list-delete-btn"
                    onClick={() => deleteFromList(room)}
                    title="Delete Room Permanently"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <p className="room-list-note">(Showing rooms you've chatted in)</p>
          </div>
        )}
        {/* ------------------- */}

      </div>
    </div>
  );
}