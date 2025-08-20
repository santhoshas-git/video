// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("join-room", ({ roomId }) => {
    socket.join(roomId);
    console.log(`${socket.id} joined room ${roomId}`);

    // Notify others in the room
    socket.to(roomId).emit("new-peer", { id: socket.id });
  });

  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("candidate", ({ candidate, to }) => {
    io.to(to).emit("candidate", { candidate, from: socket.id });
  });

  socket.on("renegotiate", ({ to }) => {
    io.to(to).emit("renegotiate", { from: socket.id });
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms].filter(r => r !== socket.id);
    rooms.forEach(roomId => {
      socket.to(roomId).emit("peer-left", { id: socket.id });
    });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(5000, () => {
  console.log("Signaling server running on http://localhost:5000");
});
