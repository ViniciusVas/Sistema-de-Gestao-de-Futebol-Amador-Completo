import { Router } from "express";

import {
  registrarEvento,
  listarEventos
} from "../controllers/eventoController.js";

const router = Router();

router.post(
  "/peladas/:id/eventos",
  registrarEvento
);

router.get(
  "/peladas/:id/eventos",
  listarEventos
);

export default router;