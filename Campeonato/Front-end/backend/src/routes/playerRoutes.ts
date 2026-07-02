import { Router } from 'express';
import { PlayerController } from '../controllers/PlayerController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const playerController = new PlayerController();

router.get('/', authMiddleware, playerController.list);
router.post('/', authMiddleware, playerController.create);
router.get('/:id', playerController.getOne);
router.put('/:id', authMiddleware, playerController.update);
router.delete('/:id', authMiddleware, playerController.delete);
router.get('/:id/estatisticas', playerController.getStats);

export default router;
