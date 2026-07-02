import express from "express";
import { sortearTimes, listarTimes } from "../controllers/sorteioController.js";
import { ajustarTimes, confirmarTimes, restaurarTimes } from "../controllers/sorteioController.js";

const router = express.Router();

router.post("/peladas/:id/sortear", sortearTimes);
router.get("/peladas/:id/times", listarTimes);
router.post("/peladas/:id/times/ajustar", ajustarTimes);
router.post("/peladas/:id/times/restaurar", restaurarTimes);
router.post("/peladas/:id/times/confirmar", confirmarTimes);
export default router;