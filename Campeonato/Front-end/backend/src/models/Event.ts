import fs from 'fs';
import path from 'path';

const STORAGE_FILE = path.join(process.cwd(), 'backend_events_storage.json');

export interface IEvent {
  id: string;
  _id: string;
  peladaId: string;
  gameId?: string;
  timeId?: string;
  type: 'gol' | 'assistencia' | 'cartao_amarelo' | 'cartao_vermelho';
  playerId: string;
  jogadorNome?: string;
  assistPlayerId?: string;
  minuto?: number;
  timestamp: string | Date;
}

const loadEvents = (): IEvent[] => {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      return JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error loading backend events store:', err);
  }
  return [];
};

const saveEvents = (events: IEvent[]) => {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(events, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving backend events store:', err);
  }
};

export default class Event {
  _id: string;
  id: string;
  peladaId: string;
  gameId?: string;
  timeId?: string;
  type: 'gol' | 'assistencia' | 'cartao_amarelo' | 'cartao_vermelho';
  playerId: string;
  jogadorNome?: string;
  assistPlayerId?: string;
  minuto?: number;
  timestamp: Date;

  constructor(data: any) {
    const randomId = Math.random().toString(36).substr(2, 9);
    this._id = data._id || data.id || randomId;
    this.id = this._id;
    this.peladaId = data.peladaId || data.pelada;
    this.gameId = data.gameId || data.game;
    this.timeId = data.timeId || data.time;
    this.type = data.type || data.tipo;
    this.playerId = data.playerId || data.jogador;
    this.jogadorNome = data.jogadorNome || data.jogador_nome;
    this.assistPlayerId = data.assistPlayerId || data.jogador_assistencia;
    this.minuto = data.minuto;
    
    if (data.timestamp) {
      this.timestamp = new Date(data.timestamp);
    } else {
      this.timestamp = new Date();
    }
  }

  toJSON() {
    return {
      _id: this._id,
      id: this._id,
      peladaId: this.peladaId,
      gameId: this.gameId,
      timeId: this.timeId,
      type: this.type,
      playerId: this.playerId,
      jogadorNome: this.jogadorNome,
      assistPlayerId: this.assistPlayerId,
      minuto: this.minuto,
      timestamp: this.timestamp.toISOString()
    };
  }

  async save() {
    const events = loadEvents();
    const eventData: IEvent = {
      id: this._id,
      _id: this._id,
      peladaId: this.peladaId,
      gameId: this.gameId,
      timeId: this.timeId,
      type: this.type,
      playerId: this.playerId,
      jogadorNome: this.jogadorNome,
      assistPlayerId: this.assistPlayerId,
      minuto: this.minuto,
      timestamp: this.timestamp.toISOString()
    };
    events.push(eventData);
    saveEvents(events);
    return this;
  }

  static find(query?: any): any {
    const events = loadEvents();
    let results = events;
    if (query && query.peladaId) {
      results = results.filter(e => e.peladaId === query.peladaId);
    }
    
    const instances = results.map(e => new Event(e));

    const sortableResult = Object.assign(instances, {
      sort: () => sortableResult
    });

    return sortableResult;
  }

  static findByIdAndDelete(id: string) {
    const events = loadEvents();
    const found = events.find(e => e._id === id || e.id === id);
    const filtered = events.filter(e => e._id !== id && e.id !== id);
    saveEvents(filtered);
    return found ? new Event(found) : null;
  }

  static deleteMany(query: any) {
    const events = loadEvents();
    let filtered = events;
    if (query && query.peladaId) {
      filtered = events.filter(e => e.peladaId !== query.peladaId);
    }
    saveEvents(filtered);
    return { deletedCount: events.length - filtered.length };
  }
}
