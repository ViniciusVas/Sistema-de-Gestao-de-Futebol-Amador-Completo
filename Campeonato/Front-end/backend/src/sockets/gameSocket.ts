import { Server, Socket } from 'socket.io';
import fs from 'fs';
import path from 'path';

const STORAGE_FILE = path.join(process.cwd(), 'backend_local_storage.json');

// Initialize empty store
let backendLocalStorage: Record<string, any> = {};

// Load existing data at startup
try {
  if (fs.existsSync(STORAGE_FILE)) {
    const fileContent = fs.readFileSync(STORAGE_FILE, 'utf-8');
    backendLocalStorage = JSON.parse(fileContent);
    console.log('[Socket DB] Loaded backend local storage with keys:', Object.keys(backendLocalStorage));
  }
} catch (err) {
  console.error('[Socket DB] Error loading backend local storage:', err);
}

const saveBackendLocalStorage = () => {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(backendLocalStorage, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Socket DB] Error saving backend local storage:', err);
  }
};

export const setupGameSockets = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    // Initial sync
    socket.on('request-initial-data', () => {
      console.log('[Socket DB] Sending initial saved state keys to client:', socket.id);
      for (const [key, value] of Object.entries(backendLocalStorage)) {
        socket.emit('local-data-sync', { key, data: value });
      }
    });

    // Real-time local storage sync
    socket.on('local-data-change', (payload: { key: string, data: any }) => {
      if (payload && payload.key) {
        // Only log length or basic structure to keep logs clean
        console.log(`[Socket DB] Updating backend key: "${payload.key}"`);
        backendLocalStorage[payload.key] = payload.data;
        saveBackendLocalStorage();
        
        // Broadcast the update to all OTHER connected sockets
        socket.broadcast.emit('local-data-sync', payload);
      }
    });

    socket.on('join-game', (peladaId: string) => {
      socket.join(`game:${peladaId}`);
      console.log(`User joined game room: ${peladaId}`);
    });

    socket.on('cronometro:iniciar', (data: { peladaId: string, segundos: number }) => {
      io.to(`game:${data.peladaId}`).emit('cronometro:atualizado', { status: 'running', segundos: data.segundos });
    });

    socket.on('cronometro:pausar', (data: { peladaId: string, segundos: number }) => {
      io.to(`game:${data.peladaId}`).emit('cronometro:atualizado', { status: 'paused', segundos: data.segundos });
    });

    socket.on('cronometro:reiniciar', (data: { peladaId: string }) => {
      io.to(`game:${data.peladaId}`).emit('cronometro:atualizado', { status: 'reset', segundos: 0 });
    });

    socket.on('placar:atualizar', (data: { peladaId: string, casa: number, visitante: number }) => {
      io.to(`game:${data.peladaId}`).emit('placar:atualizado', { casa: data.casa, visitante: data.visitante });
    });

    socket.on('evento:novo', (data: { peladaId: string, evento: any }) => {
      io.to(`game:${data.peladaId}`).emit('evento:recebido', data.evento);
    });

    socket.on('game:atualizar', (peladaId: string) => {
      io.to(`game:${peladaId}`).emit('game:refresh');
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};

