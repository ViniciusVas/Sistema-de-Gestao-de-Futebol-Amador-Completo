import express from "express";
import {
  listarOrdemTimes,
  substituirJogador,
  rodarTimes,
  encerrarPartidaERodar
} from "../controllers/timeController.js";

const router = express.Router();

router.get("/peladas/:id/timesordem", listarOrdemTimes);
router.post("/peladas/:id/substituir", substituirJogador);
router.post("/peladas/:id/rodar-times", rodarTimes);
router.post("/peladas/:id/partida/encerrar-e-rodar", encerrarPartidaERodar);

export default router;