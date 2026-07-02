import express from "express";
import * as controller from "../controllers/peladaController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, controller.criarPelada);
router.get("/", authMiddleware, controller.listarPeladas);
router.get("/:id", authMiddleware, controller.detalharPelada);
router.put("/:id", authMiddleware, controller.atualizarPelada);

router.post("/:id/jogadores", authMiddleware, controller.adicionarJogador);
router.delete("/:id/jogadores/:jogadorId", authMiddleware, controller.removerJogador);

router.put("/:id/jogadores/reordenar", authMiddleware, controller.reordenar);
router.put("/:id/jogadores/confirmar-presenca", authMiddleware, controller.confirmarPresenca);

export default router;