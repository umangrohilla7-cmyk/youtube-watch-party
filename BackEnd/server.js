const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-memory store for rooms: roomId -> Room Object
const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 1. Join Room Event
  socket.on('join_room', ({ roomId, username }) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        hostId: socket.id,
        participants: {},
        videoState: { playState: false, currentTime: 0, videoId: 'dQw4w9WgXcQ' }
      });
    }

    const room = rooms.get(roomId);
    
    // Creator is Host, others are Participant[cite: 3]
    const role = (socket.id === room.hostId) ? 'Host' : 'Participant';
    room.participants[socket.id] = { username, role };

    // Broadcast user joined and updated participant list[cite: 3]
    io.to(roomId).emit('user_joined', {
      username,
      userId: socket.id,
      role,
      participants: room.participants
    });

    // Send current video state to the newly joined client
    socket.emit('sync_state', room.videoState);
  });

  // Helper function to validate Host or Moderator permissions
  const hasControlPermission = (roomId, socketId) => {
    const room = rooms.get(roomId);
    if (!room) return false;
    const userRole = room.participants[socketId]?.role;
    return userRole === 'Host' || userRole === 'Moderator';
  };

  // 2. Play Event[cite: 3]
  socket.on('play', ({ roomId }) => {
    if (!hasControlPermission(roomId, socket.id)) return;
    const room = rooms.get(roomId);
    if (room) room.videoState.playState = true;
    socket.to(roomId).emit('play');
  });

  // 3. Pause Event[cite: 3]
  socket.on('pause', ({ roomId }) => {
    if (!hasControlPermission(roomId, socket.id)) return;
    const room = rooms.get(roomId);
    if (room) room.videoState.playState = false;
    socket.to(roomId).emit('pause');
  });

  // 4. Seek Event[cite: 3]
  socket.on('seek', ({ roomId, time }) => {
    if (!hasControlPermission(roomId, socket.id)) return;
    const room = rooms.get(roomId);
    if (room) room.videoState.currentTime = time;
    socket.to(roomId).emit('seek', { time });
  });

  // 5. Change Video Event[cite: 3]
  socket.on('change_video', ({ roomId, videoId }) => {
    if (!hasControlPermission(roomId, socket.id)) return;
    const room = rooms.get(roomId);
    if (room) {
      room.videoState.videoId = videoId;
      room.videoState.currentTime = 0;
      room.videoState.playState = true;
    }
    io.to(roomId).emit('change_video', { videoId });
  });

  // 6. Assign Role Event (Host Only)[cite: 3]
  socket.on('assign_role', ({ roomId, targetUserId, role }) => {
    const room = rooms.get(roomId);
    if (!room || room.hostId !== socket.id) return; // Strict Host check[cite: 1, 2, 3]

    if (room.participants[targetUserId]) {
      room.participants[targetUserId].role = role;
      io.to(roomId).emit('role_assigned', {
        userId: targetUserId,
        username: room.participants[targetUserId].username,
        role,
        participants: room.participants
      });
    }
  });

  // 7. Remove Participant Event (Host Only)[cite: 3]
  socket.on('remove_participant', ({ roomId, targetUserId }) => {
    const room = rooms.get(roomId);
    if (!room || room.hostId !== socket.id) return; // Strict Host check[cite: 1, 2, 3]

    if (room.participants[targetUserId]) {
      delete room.participants[targetUserId];
      io.to(targetUserId).emit('participant_removed');
      io.to(roomId).emit('participant_removed', {
        userId: targetUserId,
        participants: room.participants
      });
    }
  });

  // 8. Leave Room / Disconnect Handling[cite: 3]
  socket.on('leave_room', ({ roomId }) => {
    handleDisconnect(socket, roomId);
  });

  socket.on('disconnect', () => {
    for (const [roomId, room] of rooms.entries()) {
      if (room.participants[socket.id]) {
        handleDisconnect(socket, roomId);
        break;
      }
    }
  });

  function handleDisconnect(sock, roomId) {
    const room = rooms.get(roomId);
    if (!room || !room.participants[sock.id]) return;

    const username = room.participants[sock.id].username;
    delete room.participants[sock.id];
    sock.leave(roomId);

    if (Object.keys(room.participants).length === 0) {
      rooms.delete(roomId);
    } else {
      if (room.hostId === sock.id) {
        const newHostId = Object.keys(room.participants)[0];
        room.hostId = newHostId;
        room.participants[newHostId].role = 'Host';
      }
      io.to(roomId).emit('user_left', {
        username,
        userId: sock.id,
        participants: room.participants
      });
    }
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Watch Party server running on port ${PORT}`);
});