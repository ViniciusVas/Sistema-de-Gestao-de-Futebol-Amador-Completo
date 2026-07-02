import { Request, Response } from 'express';
import { EventService } from '../services/EventService';

const eventService = new EventService();

export class EventController {
  async create(req: Request, res: Response) {
    try {
      const peladaId = req.params.id || req.body.pelada;
      const result = await eventService.create({ ...req.body, pelada: peladaId });
      res.status(201).json({
        ...result.toJSON(),
        id: result._id,
        jogador_id: result.playerId,
        tipo: result.type,
        minuto: (result as any).minuto || 0
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async list(req: Request, res: Response) {
    try {
      const peladaId = req.params.id || req.query.pelada;
      if (!peladaId) return res.status(400).json({ error: 'Pelada ID is required' });
      
      const results = await eventService.getByPelada(peladaId as string);
      res.json(results.map(r => ({
        id: r._id,
        tipo: r.type,
        jogador_id: r.playerId,
        jogador_assistencia: r.assistPlayerId || null,
        jogador_nome: (r as any).jogador_nome || "", // Support for name if stored or joined
        minuto: (r as any).minuto || 0,
        timestamp: r.timestamp
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
