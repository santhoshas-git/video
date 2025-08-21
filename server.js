// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`${socket.id} joined room ${roomId}`);

    // Send existing participants to the new joiner
    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    const others = clients.filter((id) => id !== socket.id);
    socket.emit("all-users", { users: others });

    // Notify others that a new user joined
    socket.to(roomId).emit("user-joined", { id: socket.id });
  });

  socket.on("offer", ({ to, sdp, streamType, roomId }) => {
    io.to(to).emit("offer", { from: socket.id, sdp, streamType });
  });

  socket.on("answer", ({ to, sdp, streamType }) => {
    io.to(to).emit("answer", { from: socket.id, sdp, streamType });
  });

  socket.on("candidate", ({ to, candidate, streamType }) => {
    io.to(to).emit("candidate", { from: socket.id, candidate, streamType });
  });

  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit("user-left", { id: socket.id });
    console.log(`${socket.id} left room ${roomId}`);
  });

  socket.on("disconnect", () => {
    // broadcast user-left to all rooms this socket was in
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue;
      socket.to(roomId).emit("user-left", { id: socket.id });
    }
    console.log("socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Signaling server running on :${PORT}`));
