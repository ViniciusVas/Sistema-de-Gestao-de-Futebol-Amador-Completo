import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
  transports: ["polling", "websocket"],
  reconnectionAttempts: 5,
  timeout: 10000,
});

socket.on("connect_error", (err) => {
  console.warn("Socket connection warning/fallback:", err.message);
});

export default socket;
