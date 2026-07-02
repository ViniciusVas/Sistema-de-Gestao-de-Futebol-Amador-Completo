import express from "express";

import {
  finalizarPelada,
  getEstatisticasJogador
} from "../controllers/estatisticaController.js";

const router = express.Router();

// finalizar pelada e processar estatísticas
router.post(
  "/peladas/:id/finalizar",
  finalizarPelada
);

// estatísticas públicas do jogador
router.get(
  "/jogadores/:id/estatisticas",
  getEstatisticasJogador
);

export default router;