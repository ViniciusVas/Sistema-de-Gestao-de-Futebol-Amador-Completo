import express from "express";

import {
  listarPagamentos,
  atualizarPagamento,
  calcularRateio,
  atualizarConfigPagamento
} from "../controllers/pagamentoController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get(
  "/peladas/:id/pagamentos",
  authMiddleware,
  listarPagamentos
);

router.put(
  "/peladas/:id/pagamentos/:jogador_id",
  authMiddleware,
  atualizarPagamento
);

router.get(
  "/peladas/:id/rateio",
  authMiddleware,
  calcularRateio
);

router.put(
  "/peladas/:id/config-pagamento",
  authMiddleware,
  atualizarConfigPagamento
);

export default router;