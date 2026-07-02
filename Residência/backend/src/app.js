import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// ROTAS
import authRoutes from './routes/authRoutes.js';
import jogadoresRoutes from './routes/jogadores.js';
import peladaRoutes from "./routes/peladaRoutes.js";
import sorteioRoutes from "./routes/sorteioRoutes.js";
import timeRoutes from "./routes/timeRoutes.js";
import jogoAoVivoRoutes from "./routes/jogoAoVivoRoutes.js";
import eventoRoutes from "./routes/eventoRoutes.js";
import estatisticaRoutes from "./routes/estatisticaRoutes.js";
import pagamentoRoutes from "./routes/pagamentoRoutes.js";

// MIDDLEWARE
import { authMiddleware } from './middlewares/authMiddleware.js';

dotenv.config();

const app = express();

// 🔧 MIDDLEWARES GLOBAIS
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

// 🧪 ROTA DE TESTE
app.get('/api/test', (req, res) => {
  res.json({ message: 'API funcionando 🚀' });
});

// 🔐 ROTAS DE AUTENTICAÇÃO
app.use('/api/auth', authRoutes);

// 🎮 ROTAS DE JOGADORES (PROTEGIDAS)
app.use('/api/jogadores', jogadoresRoutes);

// ⚽ ROTAS DE PELADAS (PROTEGIDAS)
app.use("/api/peladas", peladaRoutes);

// 🎲 ROTA DE SORTEIO (PROTEGIDA)
app.use("/api", sorteioRoutes);

// 🏆 ROTAS DE TIMES (PROTEGIDAS)
app.use("/api", timeRoutes);

// ⏱️ ROTAS DE JOGO AO VIVO (PROTEGIDAS)
app.use("/api/jogo", jogoAoVivoRoutes);

// 📝 ROTAS DE EVENTOS 
app.use("/api", eventoRoutes);

// 📊 ROTAS DE ESTATÍSTICAS
app.use("/api", estatisticaRoutes);

// 💰 ROTAS DE PAGAMENTOS
app.use("/api", pagamentoRoutes);

// 🔒 ROTA PROTEGIDA (teste)
app.get('/api/perfil', authMiddleware, (req, res) => {
  res.json({
    mensagem: 'Acesso autorizado',
    user: req.user
  });
});

export default app;