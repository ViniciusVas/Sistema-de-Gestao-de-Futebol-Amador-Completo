import { Router } from "express";

import {
  iniciarCronometro,
  pausarCronometro,
  reiniciarCronometro,
  atualizarPlacar
} from "../controllers/jogoAoVivoController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.post(
  "/:id/cronometro/iniciar",
  authMiddleware,
  iniciarCronometro
);

router.post(
  "/:id/cronometro/pausar",
  authMiddleware,
  pausarCronometro
);

router.post(
  "/:id/cronometro/reiniciar",
  authMiddleware,
  reiniciarCronometro
);

router.post(
  "/:id/placar",
  authMiddleware,
  atualizarPlacar
);

export default router;