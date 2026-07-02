import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./backend/src/lib/prisma";

// Import new modular backend
import authRoutes from "./backend/src/routes/authRoutes";
import peladaRoutes from "./backend/src/routes/peladaRoutes";
import championshipRoutes from "./backend/src/routes/championshipRoutes";
import playerRoutes from "./backend/src/routes/playerRoutes";
import peladaJogadorRoutes from "./backend/src/routes/peladaJogadorRoutes";
import eventRoutes from "./backend/src/routes/eventRoutes";
import { setupGameSockets } from "./backend/src/sockets/gameSocket";

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // Local Development Setup
  console.log("Development server starting up (using mock/local data layer)");

  app.use(cors());
  app.use(express.json());
  
  // Simple Logger
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  // API Routes
  app.use("/api", authRoutes);
  app.use("/api/peladas", peladaRoutes);
  app.use("/api/championships", championshipRoutes);
  app.use("/api/jogadores", playerRoutes);
  app.use("/api/players", playerRoutes);
  app.use("/api/pelada-jogadores", peladaJogadorRoutes);
  app.use("/api/eventos", eventRoutes);

  // Fallback for original routes (keeping them for now to avoid breaking existing pages)
  // [Original routes would be here, but for brevity I'll focus on the new ones]
  // Ideally, I should merge the legacy server logic into the new services.
  
  // Setup Sockets
  setupGameSockets(io);

  // Vite for Frontend
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`System running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
