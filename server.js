// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*" } });

// Store per-room offers
const rooms = {};
/*
rooms = {
  roomId: {
    offers: [ { from, sdp, streamType } ]
  }
}
*/

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);

  // -------- JOIN ROOM --------
  socket.on("join-room", (roomId) => {
    if (!roomId || roomId.trim() === "") return;
  console.log("peter");
    socket.join(roomId);
    console.log(`${socket.id} joined room ${roomId}`);

    if (!rooms[roomId]) rooms[roomId] = { offers: [] };

    // Send existing users
    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    const others = clients.filter((id) => id !== socket.id);
    socket.emit("all-users", { users: others });

    // 🔑 Replay all stored offers (camera/screen) to the late joiner
    if (rooms[roomId].offers.length > 0) {
      rooms[roomId].offers.forEach((offer) => {
        socket.emit("offer", offer);
      });
    }

    // Notify others
    socket.to(roomId).emit("user-joined", { id: socket.id });
  });

  // -------- OFFER --------
  socket.on("offer", ({ to, sdp, streamType, roomId }) => {
    console.log(`Offer from ${socket.id} (${streamType})`);

    if (!rooms[roomId]) rooms[roomId] = { offers: [] };

    // Store or update this offer
    const existing = rooms[roomId].offers.find(
      (o) => o.from === socket.id && o.streamType === streamType
    );
    if (existing) {
      existing.sdp = sdp;
    } else {
      rooms[roomId].offers.push({ from: socket.id, sdp, streamType });
    }

    if (to) {
      io.to(to).emit("offer", { from: socket.id, sdp, streamType });
    } else {
      socket.to(roomId).emit("offer", { from: socket.id, sdp, streamType });
    }
  });

  // -------- ANSWER --------
  socket.on("answer", ({ to, sdp, streamType }) => {
    io.to(to).emit("answer", { from: socket.id, sdp, streamType });
  });

  // -------- ICE CANDIDATES --------
  socket.on("candidate", ({ to, candidate, streamType }) => {
    io.to(to).emit("candidate", { from: socket.id, candidate, streamType });
  });

  // -------- LEAVE --------
  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit("user-left", { id: socket.id });

    // Remove stored offers for this user
    if (rooms[roomId]) {
      rooms[roomId].offers = rooms[roomId].offers.filter(
        (o) => o.from !== socket.id
      );
    }

    console.log(`${socket.id} left room ${roomId}`);
  });

  // -------- DISCONNECT --------
  socket.on("disconnect", () => {
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue;
      socket.to(roomId).emit("user-left", { id: socket.id });

      if (rooms[roomId]) {
        rooms[roomId].offers = rooms[roomId].offers.filter(
          (o) => o.from !== socket.id
        );
      }
    }
    console.log("socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`Signaling server running on :${PORT}`)
);



