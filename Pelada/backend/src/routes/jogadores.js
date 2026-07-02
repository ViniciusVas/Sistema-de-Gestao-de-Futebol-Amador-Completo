import express from "express";
import {
  criarJogador,
  listarJogadores,
  editarJogador,
  deletarJogador
} from "../controllers/jogadorController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, criarJogador);
router.get("/", authMiddleware, listarJogadores);
router.put("/:id", authMiddleware, editarJogador);
router.delete("/:id", authMiddleware, deletarJogador);

export default router;