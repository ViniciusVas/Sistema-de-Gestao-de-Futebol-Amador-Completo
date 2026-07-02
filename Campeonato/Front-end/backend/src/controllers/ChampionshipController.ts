import { Request, Response } from 'express';
import { ChampionshipService } from '../services/ChampionshipService';

const championshipService = new ChampionshipService();

export class ChampionshipController {
  async list(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const result = await championshipService.getAll(userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getOne(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await championshipService.getById(id);
      if (!result) return res.status(404).json({ error: 'Championship not found' });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const result = await championshipService.create(req.body, userId);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async generateTable(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await championshipService.generateTable(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getStandings(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await championshipService.getStandings(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getScorers(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await championshipService.getScorers(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getCards(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await championshipService.getCards(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async addTeam(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nome } = req.body;
      const result = await championshipService.addTeam(id, nome);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async recordResult(req: Request, res: Response) {
    try {
      const { id, gameId } = req.params;
      const result = await championshipService.recordResult(id, gameId, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateGameTime(req: Request, res: Response) {
    try {
      const { id, gameId } = req.params;
      const { data_hora } = req.body;
      const result = await championshipService.updateGameTime(id, gameId, data_hora);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async addTeamPlayer(req: Request, res: Response) {
    try {
      const { id, teamId } = req.params;
      const { playerName } = req.body;
      const result = await championshipService.addTeamPlayer(id, teamId, playerName);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async removeTeamPlayer(req: Request, res: Response) {
    try {
      const { id, teamId } = req.params;
      const { playerName } = req.body;
      const result = await championshipService.removeTeamPlayer(id, teamId, playerName);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
