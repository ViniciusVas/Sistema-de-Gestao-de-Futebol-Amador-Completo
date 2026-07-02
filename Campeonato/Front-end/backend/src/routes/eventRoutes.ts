import { Router } from 'express';
import { EventController } from '../controllers/EventController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const eventController = new EventController();

router.get('/', eventController.list);
router.post('/', authMiddleware, eventController.create);

export default router;
