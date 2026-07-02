import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on('connection', (socket) => {

  console.log('Cliente conectado:', socket.id);

  // entrar em uma sala da pelada
  socket.on('entrar-pelada', (peladaId) => {

    socket.join(`pelada-${peladaId}`);

    console.log(
      `Socket ${socket.id} entrou na sala pelada-${peladaId}`
    );
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});