import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Silence benign/expected WebSocket connections under sandy environment
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const msg = event?.reason?.message || String(event?.reason || "");
    if (
      msg.includes("WebSocket") || 
      msg.includes("close") || 
      msg.includes("socket") ||
      msg.includes("packet")
    ) {
      console.warn("Benign background network rejection caught:", msg);
      event.preventDefault(); // Prevent showing in console/UI as unhandled
    }
  });

  window.addEventListener("error", (event) => {
    const msg = event?.message || "";
    if (
      msg.includes("WebSocket") || 
      msg.includes("socket") || 
      msg.includes("connection")
    ) {
      console.warn("Benign background network error caught:", msg);
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
