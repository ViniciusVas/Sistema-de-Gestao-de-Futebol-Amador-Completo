import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = (peladaId: string | null) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!peladaId) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
      transports: ["polling", "websocket"],
      reconnectionAttempts: 5,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on("connect_error", (err) => {
      console.warn("Hook socket connection warning:", err.message);
    });

    socket.emit('join-game', peladaId);

    return () => {
      socket.disconnect();
    };
  }, [peladaId]);

  const emit = (event: string, data: any) => {
    if (socketRef.current) {
      socketRef.current.emit(event, { ...data, peladaId });
    }
  };

  const on = (event: string, callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  return { emit, on };
};
