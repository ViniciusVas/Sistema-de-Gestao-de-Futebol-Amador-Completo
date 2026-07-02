import { Router } from 'express';
import { PeladaController } from '../controllers/PeladaController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const peladaController = new PeladaController();

router.patch('/:id', authMiddleware, peladaController.updatePlayer);
router.delete('/:id', authMiddleware, peladaController.removePlayer);

export default router;
