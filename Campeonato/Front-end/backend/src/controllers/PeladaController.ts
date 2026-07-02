import { Request, Response } from 'express';
import { PeladaService } from '../services/PeladaService';

const peladaService = new PeladaService();

export class PeladaController {
  async list(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const result = await peladaService.getAll(userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getOne(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await peladaService.getById(id);
      if (!result) return res.status(404).json({ error: 'Pelada not found' });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const result = await peladaService.create(req.body, userId);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await peladaService.update(id, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async addPlayer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { jogador_id } = req.body;
      const result = await peladaService.addPlayer(id, jogador_id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async removePlayer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await peladaService.removePlayer(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updatePlayer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await peladaService.updatePlayer(id, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async reorderPlayers(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { ordem } = req.body;
      const result = await peladaService.reorderPlayers(id, ordem);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async sort(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tipo } = req.query;
      const result = await peladaService.sortTeams(id, (tipo as 'aleatorio' | 'balanceado') || 'aleatorio');
      res.json(result);
    } catch (error: any) {
      const status = error.message.includes('Necessário') || error.message.includes('not found') ? 400 : 500;
      res.status(status).json({ error: error.message });
    }
  }

  async getTimes(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await peladaService.getTeams(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async adjust(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { times } = req.body;
      const result = await peladaService.adjustTeams(id, times);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async confirm(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await peladaService.confirmTeams(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateMatch(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await peladaService.updateMatchState(id, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async rotate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { time_id } = req.body;
      const result = await peladaService.rotateTeams(id, time_id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async removeFromTeam(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { jogador_id } = req.body;
      const result = await peladaService.removeFromTeam(id, jogador_id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async substitute(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { sai_id, entra_id } = req.body;
      const result = await peladaService.substitutePlayer(id, sai_id, entra_id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async finalize(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await peladaService.finalizePelada(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await peladaService.delete(id);
      res.json({ message: 'Pelada deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async togglePayment(req: Request, res: Response) {
    try {
      const { id, jogador_id } = req.params;
      const result = await peladaService.togglePayment(id, jogador_id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getRateio(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await peladaService.getRateio(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
