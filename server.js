const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

io.on('connection', socket => {
  console.log('socket connected', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    // Send existing users to the joining socket
    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    // clients includes the new socket too; filter it out
    const otherClients = clients.filter(id => id !== socket.id);
    socket.emit('all-users', otherClients);
    // Notify others that a new user joined
    socket.to(roomId).emit('user-joined', socket.id);
  });

  socket.on('offer', ({ offer, to }) => {
    io.to(to).emit('offer', { offer, from: socket.id });
  });

  socket.on('answer', ({ answer, to }) => {
    io.to(to).emit('answer', { answer, from: socket.id });
  });

  socket.on('ice-candidate', ({ candidate, to }) => {
    io.to(to).emit('ice-candidate', { candidate, from: socket.id });
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit('user-left', socket.id);
  });

  socket.on('chat-message', ({ roomId, message, name }) => {
    io.to(roomId).emit('chat-message', { message, name, from: socket.id, ts: Date.now() });
  });

  socket.on('disconnecting', () => {
    // notify rooms about leaving
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id) socket.to(roomId).emit('user-left', socket.id);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log('Server listening on', PORT));