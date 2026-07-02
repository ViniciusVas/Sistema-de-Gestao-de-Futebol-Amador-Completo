import { Router } from 'express';
import { PeladaController } from '../controllers/PeladaController';
import { EventController } from '../controllers/EventController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const peladaController = new PeladaController();
const eventController = new EventController();

router.get('/', authMiddleware, peladaController.list);
router.post('/', authMiddleware, peladaController.create);
router.get('/:id', peladaController.getOne);
router.put('/:id', authMiddleware, peladaController.update);
router.delete('/:id', authMiddleware, peladaController.delete);
router.post('/:id/jogadores', authMiddleware, peladaController.addPlayer);
router.put('/:id/jogadores/reordenar', authMiddleware, peladaController.reorderPlayers);
router.post('/:id/sortear', authMiddleware, peladaController.sort);
router.get('/:id/times', peladaController.getTimes);
router.post('/:id/times/ajustar', authMiddleware, peladaController.adjust);
router.post('/:id/times/confirmar', authMiddleware, peladaController.confirm);
router.post('/:id/rodar-times', authMiddleware, peladaController.rotate);
router.post('/:id/retirar-jogador', authMiddleware, peladaController.removeFromTeam);
router.post('/:id/substituir', authMiddleware, peladaController.substitute);
router.put('/:id/update-match', authMiddleware, peladaController.updateMatch);
router.post('/:id/finalize', authMiddleware, peladaController.finalize);
router.put('/:id/pagamentos/:jogador_id', authMiddleware, peladaController.togglePayment);
router.get('/:id/rateio', authMiddleware, peladaController.getRateio);

router.get('/:id/eventos', eventController.list);
router.post('/:id/eventos', authMiddleware, eventController.create);

export default router;
