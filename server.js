// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Change this to your React app URL in prod
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // notify other peers of the new user
  socket.broadcast.emit("new-peer", { id: socket.id });

  // relay offer
  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  // relay answer
  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  // relay ICE candidates
  socket.on("candidate", ({ candidate, to }) => {
    io.to(to).emit("candidate", { candidate, from: socket.id });
  });

  // renegotiation trigger (when someone switches camera ↔ screen)
  socket.on("renegotiate", ({ to }) => {
    io.to(to).emit("renegotiate", { from: socket.id });
  });

  // cleanup
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    io.emit("peer-left", { id: socket.id });
  });
});

server.listen(5000, () => {
  console.log("Signaling server running on http://localhost:5000");
});
