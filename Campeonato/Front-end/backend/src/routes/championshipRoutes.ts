import { Router } from 'express';
import { ChampionshipController } from '../controllers/ChampionshipController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const championshipController = new ChampionshipController();

router.get('/', authMiddleware, championshipController.list);
router.post('/', authMiddleware, championshipController.create);
router.get('/:id', championshipController.getOne);
router.post('/:id/gerar_tabela', authMiddleware, championshipController.generateTable);
router.get('/:id/classificacao', championshipController.getStandings);
router.get('/:id/artilharia', championshipController.getScorers);
router.get('/:id/cartoes', championshipController.getCards);
router.post('/:id/times', authMiddleware, championshipController.addTeam);
router.post('/:id/times/:teamId/jogadores', authMiddleware, championshipController.addTeamPlayer);
router.delete('/:id/times/:teamId/jogadores', authMiddleware, championshipController.removeTeamPlayer);
router.post('/:id/jogos/:gameId/registrar', authMiddleware, championshipController.recordResult);
router.put('/:id/jogos/:gameId/horario', authMiddleware, championshipController.updateGameTime);

export default router;
