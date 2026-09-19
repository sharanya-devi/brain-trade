const io = require("socket.io")(3000, {
  cors: {
    origin: "*"
  }
});

console.log("[INFO] WebRTC Signaling server running on port 3000");

const rooms = {};

io.on("connection", socket => {
  console.log(`[CONNECT] User connected: ${socket.id}`);

  // Join room (supports 'join' and 'join-room')
  const handleJoin = (room) => {
    if (!rooms[room]) rooms[room] = [];
    if (!rooms[room].includes(socket.id)) {
      rooms[room].push(socket.id);
    }
    socket.join(room);
    console.log(`[ROOM] Socket ${socket.id} joined room: ${room} (Total: ${rooms[room].length})`);
    socket.to(room).emit("user-joined", socket.id);
  };

  socket.on("join", handleJoin);
  socket.on("join-room", handleJoin);

  // Relay generic signal
  socket.on("signal", ({ room, signal, to }) => {
    if (to) {
      io.to(to).emit("signal", { signal, from: socket.id, room });
    } else if (room) {
      socket.to(room).emit("signal", { signal, from: socket.id, room });
    }
  });

  // Relay specific WebRTC message types for full compatibility
  socket.on("offer", (data) => {
    const room = data.room || data.roomId;
    if (room) socket.to(room).emit("offer", data.offer || data);
  });

  socket.on("answer", (data) => {
    const room = data.room || data.roomId;
    if (room) socket.to(room).emit("answer", data.answer || data);
  });

  socket.on("ice-candidate", (data) => {
    const room = data.room || data.roomId;
    if (room) socket.to(room).emit("ice-candidate", data.candidate || data);
  });

  // Leave room
  socket.on("leave", (room) => {
    socket.leave(room);
    if (rooms[room]) {
      rooms[room] = rooms[room].filter(id => id !== socket.id);
    }
    socket.to(room).emit("user-left", socket.id);
    console.log(`[ROOM] Socket ${socket.id} left room: ${room}`);
  });

  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        if (rooms[room]) {
          rooms[room] = rooms[room].filter(id => id !== socket.id);
        }
        socket.to(room).emit("user-left", socket.id);
      }
    }
    console.log(`[DISCONNECT] Socket ${socket.id} disconnected`);
  });
});

