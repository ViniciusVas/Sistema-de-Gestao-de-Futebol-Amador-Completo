import Event, { IEvent } from '../models/Event';
import prisma from '../lib/prisma';

export class EventService {
  async create(data: any) {
    const event = new Event({
      peladaId: data.pelada,
      type: data.tipo,
      timeId: data.time || data.time_id,
      playerId: data.jogador || data.jogador_id,
      jogadorNome: data.jogador_nome,
      assistPlayerId: data.jogador_assistencia || data.jogador_assistencia_id,
      minuto: data.minuto,
      timestamp: new Date()
    });

    return await event.save();
  }

  async getByPelada(peladaId: string) {
    return await Event.find({ peladaId }).sort({ timestamp: -1 });
  }

  async delete(id: string) {
    return await Event.findByIdAndDelete(id);
  }
}
