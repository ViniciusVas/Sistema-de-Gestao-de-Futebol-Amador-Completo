
import { 
  getLocalData, 
  setLocalData, 
  saveLocalData, 
  updateLocalData, 
  deleteLocalData,
  getItemById
} from "../lib/localData";

export interface Player {
  id: string;
  nome: string;
  nivel_estrelas: number;
  posicao?: string;
  ativo: boolean;
  mensalista?: boolean;
  data_cadastro?: string;
}

export interface Team {
  id: string;
  name: string;
  city: string;
}

export interface Evento {
  id: string;
  tipo: string;
  jogador_id: string;
  jogador_nome: string;
  assistencia_id?: string | null;
  assistencia_nome?: string | null;
  minuto: number;
  time_id?: string;
}

export interface JogadorInscrito {
  id: string;
  jogador: string;
  jogador_nome: string;
  jogador_nivel: number;
  ordem_chegada: number;
  presenca_confirmada: boolean;
  pagamento_confirmado: boolean;
}

export interface Time {
  id: string;
  nome_time: string;
  soma_estrelas: number;
  order?: number;
  jogadores: {
    id: string;
    jogador_id: string;
    jogador_nome: string;
    jogador_nivel: number;
  }[];
}

export interface Pelada {
  id: string;
  titulo: string;
  data_hora: string;
  local: string;
  status: 'agendada' | 'em_andamento' | 'encerrada' | 'cancelada' | 'finalizada';
  jogadores_por_time: number;
  times_simultaneos: number;
  duracao_minutos: number;
  valor_por_jogador?: number;
  coletes: string[];
  inscritos: JogadorInscrito[];
  times?: Time[];
  eventos?: Evento[];
  valor_total?: number;
  config_pagamento_visivel?: boolean;
  placar_casa?: number;
  placar_visitante?: number;
  cronometro_segundos?: number;
  cronometro_ativo?: boolean;
  times_jogando?: number;
}

export interface PlayerStats {
  id: string;
  playerId: string;
  goals: number;
  assists: number;
  wins: number;
  draws: number;
  losses: number;
  matchesPlayed: number;
  yellowCards: number;
  redCards: number;
}

const DataService = {
  // Players
  getPlayers: () => getLocalData("jogadores") as Player[],
  getPlayerById: (id: string) => getItemById("jogadores", id) as Player | undefined,
  savePlayer: (player: Omit<Player, "id"> & { id?: string }) => {
    const p = saveLocalData("jogadores", player) as Player;
    // Initialize stats for new player
    const stats = getLocalData("playerStats") as PlayerStats[];
    if (!stats.find(s => s.playerId === p.id)) {
      const newStats: PlayerStats = {
        id: p.id,
        playerId: p.id,
        goals: 0,
        assists: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        matchesPlayed: 0,
        yellowCards: 0,
        redCards: 0
      };
      setLocalData("playerStats", [...stats, newStats]);
    }
    return p;
  },
  updatePlayer: (id: string, updates: Partial<Player>) => updateLocalData("jogadores", id, updates) as Player,
  deletePlayer: (id: string) => {
    deleteLocalData("jogadores", id);
    const stats = getLocalData("playerStats") as PlayerStats[];
    setLocalData("playerStats", stats.filter(s => s.playerId !== id));
  },

  // Stats
  getPlayerStats: (playerId: string): PlayerStats => {
    const stats = getLocalData("playerStats") as PlayerStats[];
    const found = stats.find(s => s.playerId === playerId);
    if (found) return found;
    return {
      id: playerId,
      playerId: playerId,
      goals: 0,
      assists: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      matchesPlayed: 0,
      yellowCards: 0,
      redCards: 0
    };
  },

  updatePlayerStats: (playerId: string, updates: Partial<PlayerStats>) => {
    const stats = getLocalData("playerStats") as PlayerStats[];
    let found = false;
    const updated = stats.map(s => {
      if (s.playerId === playerId) {
        found = true;
        const newStats = { ...s };
        Object.entries(updates).forEach(([key, val]) => {
          if (typeof val === 'number') {
            (newStats as any)[key] = ((newStats as any)[key] || 0) + val;
          } else {
            (newStats as any)[key] = val;
          }
        });
        return newStats;
      }
      return s;
    });

    if (!found) {
      const newStats: PlayerStats = {
        id: playerId,
        playerId: playerId,
        goals: 0,
        assists: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        matchesPlayed: 0,
        yellowCards: 0,
        redCards: 0
      };
      Object.entries(updates).forEach(([key, val]) => {
        if (typeof val === 'number') {
          (newStats as any)[key] = val;
        }
      });
      setLocalData("playerStats", [...stats, newStats]);
    } else {
      setLocalData("playerStats", updated);
    }
  },

  // Peladas
  getPeladas: () => getLocalData("peladas") as Pelada[],
  getPeladaById: (id: string) => getItemById("peladas", id) as Pelada | undefined,
  savePelada: (pelada: Partial<Pelada>) => {
    const data = {
      titulo: "",
      data_hora: new Date().toISOString(),
      local: "",
      status: 'agendada',
      jogadores_por_time: 5,
      times_simultaneos: 2,
      duracao_minutos: 10,
      coletes: ['#FF0000', '#0000FF'],
      inscritos: [],
      placar_casa: 0,
      placar_visitante: 0,
      cronometro_segundos: 0,
      cronometro_ativo: false,
      config_pagamento_visivel: true,
      eventos: [],
      ...pelada
    };
    return saveLocalData("peladas", data) as Pelada;
  },
  updatePelada: (id: string, updates: Partial<Pelada>) => updateLocalData("peladas", id, updates) as Pelada,
  deletePelada: (id: string) => {
    if (!id) return;
    deleteLocalData("peladas", id);
    // Also remove from any other related keys if necessary, 
    // though peladas are usually standalone in localData.
  },

  // Management inside Pelada
  addPlayerToPelada: (peladaId: string, playerId: string) => {
    const pelada = getItemById("peladas", peladaId) as Pelada | undefined;
    const player = getItemById("jogadores", playerId) as Player | undefined;
    if (!pelada || !player) return null;

    const inscritos = pelada.inscritos || [];
    if (inscritos.some(i => i.jogador === playerId)) return pelada;

    const newInscrito: JogadorInscrito = {
      id: Math.random().toString(36).substr(2, 9),
      jogador: player.id,
      jogador_nome: player.nome,
      jogador_nivel: player.nivel_estrelas,
      ordem_chegada: inscritos.length + 1,
      presenca_confirmada: true,
      pagamento_confirmado: false
    };

    const updated = updateLocalData("peladas", peladaId, { inscritos: [...inscritos, newInscrito] }) as Pelada;
    return updated;
  },

  removePlayerFromPelada: (peladaId: string, peladaJogadorId: string) => {
     const pelada = getItemById("peladas", peladaId) as Pelada | undefined;
     if (!pelada) return null;
     const filtered = (pelada.inscritos || []).filter(i => i.id !== peladaJogadorId);
     return updateLocalData("peladas", peladaId, { inscritos: filtered }) as Pelada;
  },

  togglePresence: (peladaId: string, peladaJogadorId: string) => {
    const pelada = getItemById("peladas", peladaId) as Pelada | undefined;
    if (!pelada) return null;
    const updated = (pelada.inscritos || []).map(i => 
      i.id === peladaJogadorId ? { ...i, presenca_confirmada: !i.presenca_confirmada } : i
    );
    return updateLocalData("peladas", peladaId, { inscritos: updated }) as Pelada;
  },

  togglePayment: (peladaId: string, peladaJogadorId: string) => {
    const pelada = getItemById("peladas", peladaId) as Pelada | undefined;
    if (!pelada) return null;
    const updated = (pelada.inscritos || []).map(i => 
      i.id === peladaJogadorId ? { ...i, pagamento_confirmado: !i.pagamento_confirmado } : i
    );
    return updateLocalData("peladas", peladaId, { inscritos: updated }) as Pelada;
  },

  reorderPlayers: (peladaId: string, playerIds: string[]) => {
    const pelada = getItemById("peladas", peladaId) as Pelada | undefined;
    if (!pelada) return null;
    
    const inscritos = [...(pelada.inscritos || [])];
    const reordered = playerIds.map((pid, index) => {
      const found = inscritos.find(i => i.jogador === pid);
      return found ? { ...found, ordem_chegada: index + 1 } : null;
    }).filter(Boolean) as JogadorInscrito[];

    return updateLocalData("peladas", peladaId, { inscritos: reordered }) as Pelada;
  },

  // Sorteio Logic (Local Backend)
  sortTeams: (peladaId: string, tipo: 'aleatorio' | 'balanceado') => {
    const pelada = getItemById("peladas", peladaId) as Pelada | undefined;
    if (!pelada || !pelada.inscritos) return null;

    const confirmed = pelada.inscritos.filter(i => i.presenca_confirmada);
    if (confirmed.length < 2) return null;

    const pPerTeam = pelada.jogadores_por_time || 5;
    const numTeams = Math.ceil(confirmed.length / pPerTeam);
    const teams: Time[] = Array.from({ length: numTeams }, (_, i) => ({
      id: Math.random().toString(36).substr(2, 9),
      nome_time: `Time ${i + 1}`,
      order: i + 1,
      jogadores: [],
      soma_estrelas: 0
    }));

    const playersToSort = [...confirmed];

    if (tipo === 'aleatorio') {
      // Shuffle
      for (let i = playersToSort.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playersToSort[i], playersToSort[j]] = [playersToSort[j], playersToSort[i]];
      }
      
      playersToSort.forEach((p, idx) => {
        const tIdx = idx % numTeams;
        teams[tIdx].jogadores.push({
          id: Math.random().toString(36).substr(2, 9),
          jogador_id: p.jogador,
          jogador_nome: p.jogador_nome,
          jogador_nivel: p.jogador_nivel
        });
      });
    } else {
      // Balanced (Snake Draft)
      playersToSort.sort((a, b) => b.jogador_nivel - a.jogador_nivel);
      
      let forward = true;
      let tIdx = 0;

      playersToSort.forEach((p) => {
        teams[tIdx].jogadores.push({
          id: Math.random().toString(36).substr(2, 9),
          jogador_id: p.jogador,
          jogador_nome: p.jogador_nome,
          jogador_nivel: p.jogador_nivel
        });

        if (forward) {
          if (tIdx === numTeams - 1) forward = false;
          else tIdx++;
        } else {
          if (tIdx === 0) forward = true;
          else tIdx--;
        }
      });
    }

    // Calculate stars
    teams.forEach(t => {
      t.soma_estrelas = t.jogadores.reduce((acc, j) => acc + j.jogador_nivel, 0);
    });

    return updateLocalData("peladas", peladaId, { times: teams }) as Pelada;
  },

  updateTeams: (peladaId: string, teams: Time[]) => {
    return updateLocalData("peladas", peladaId, { times: teams }) as Pelada;
  },

  confirmTeams: (peladaId: string) => {
    const pelada = getItemById("peladas", peladaId) as Pelada | undefined;
    const times_jogando = pelada?.times_jogando || 2;
    return updateLocalData("peladas", peladaId, { status: 'em_andamento', times_jogando }) as Pelada;
  },

  getTeams: () => getLocalData("times") as Team[],
  getTeamById: (id: string) => getItemById("times", id) as Team | undefined,
  saveTeam: (team: Partial<Team>) => saveLocalData("times", team) as Team,
  updateTeam: (id: string, updates: Partial<Team>) => updateLocalData("times", id, updates) as Team,
  deleteTeam: (id: string) => deleteLocalData("times", id),

  getChampionships: () => getLocalData("championships") as any[],
  getChampionshipById: (id: string) => getItemById("championships", id) as any | undefined,
  saveChampionship: (champ: any) => saveLocalData("championships", champ) as any,
  updateChampionship: (id: string, updates: any) => updateLocalData("championships", id, updates) as any,

  updateScore: (peladaId: string, casa: number, visitante: number) => {
    return updateLocalData("peladas", peladaId, { placar_casa: casa, placar_visitante: visitante }) as Pelada;
  },

  updateMatch: (peladaId: string, updates: Partial<Pelada>) => {
    return updateLocalData("peladas", peladaId, updates) as Pelada;
  },

  rotateTimes: (peladaId: string, timeId: string) => {
    const pelada = getItemById("peladas", peladaId) as Pelada | undefined;
    if (!pelada || !pelada.times || pelada.times.length < 2) return null;

    // 1. Record Match Results (Wins/Losses) before rotating
    const homeTeam = pelada.times[0];
    const awayTeam = pelada.times[1];
    const scoreCasa = pelada.placar_casa || 0;
    const scoreVisitante = pelada.placar_visitante || 0;

    const results: Record<string, 'wins' | 'draws' | 'losses'> = {};
    
    if (scoreCasa > scoreVisitante) {
      homeTeam.jogadores.forEach(j => results[j.jogador_id] = 'wins');
      awayTeam.jogadores.forEach(j => results[j.jogador_id] = 'losses');
    } else if (scoreVisitante > scoreCasa) {
      homeTeam.jogadores.forEach(j => results[j.jogador_id] = 'losses');
      awayTeam.jogadores.forEach(j => results[j.jogador_id] = 'wins');
    } else {
      homeTeam.jogadores.forEach(j => results[j.jogador_id] = 'draws');
      awayTeam.jogadores.forEach(j => results[j.jogador_id] = 'draws');
    }

    Object.entries(results).forEach(([pId, res]) => {
      DataService.updatePlayerStats(pId, { [res]: 1, matchesPlayed: 1 });
    });

    const times = [...pelada.times];
    const index = times.findIndex(t => t.id === timeId);
    if (index === -1) return null;

    const [removed] = times.splice(index, 1);
    times.push(removed);

    // Update order
    const ordered = times.map((t, i) => ({ ...t, order: i + 1 }));
    return updateLocalData("peladas", peladaId, { 
      times: ordered,
      placar_casa: 0,
      placar_visitante: 0,
      cronometro_segundos: 0,
      cronometro_ativo: false 
    }) as Pelada;
  },

  substitutePlayer: (peladaId: string, saiId: string, entraId: string) => {
    const pelada = getItemById("peladas", peladaId) as Pelada | undefined;
    if (!pelada || !pelada.times) return null;

    const times = JSON.parse(JSON.stringify(pelada.times)) as Time[];
    let pSai: any = null;
    let pEntra: any = null;
    let tSaiIdx = -1;
    let tEntraIdx = -1;

    times.forEach((t, tIdx) => {
      const sIdx = t.jogadores.findIndex(j => j.jogador_id === saiId);
      if (sIdx !== -1) {
        pSai = t.jogadores[sIdx];
        tSaiIdx = tIdx;
      }
      const eIdx = t.jogadores.findIndex(j => j.jogador_id === entraId);
      if (eIdx !== -1) {
        pEntra = t.jogadores[eIdx];
        tEntraIdx = tIdx;
      }
    });

    if (pSai && pEntra) {
      const sIdx = times[tSaiIdx].jogadores.findIndex(j => j.jogador_id === saiId);
      const eIdx = times[tEntraIdx].jogadores.findIndex(j => j.jogador_id === entraId);

      times[tSaiIdx].jogadores[sIdx] = pEntra;
      times[tEntraIdx].jogadores[eIdx] = pSai;

      return updateLocalData("peladas", peladaId, { times }) as Pelada;
    }
    return pelada;
  },

  removePlayerFromField: (peladaId: string, jogadorId: string) => {
    const pelada = getItemById("peladas", peladaId) as Pelada | undefined;
    if (!pelada || !pelada.times) return null;

    const times = JSON.parse(JSON.stringify(pelada.times)) as Time[];
    times.forEach(t => {
      t.jogadores = t.jogadores.filter(j => j.jogador_id !== jogadorId);
    });

    return updateLocalData("peladas", peladaId, { times }) as Pelada;
  },

  registerEvent: (peladaId: string, event: Omit<Evento, 'id'>) => {
    const pelada = getItemById("peladas", peladaId) as Pelada | undefined;
    if (!pelada) return null;

    const newEvent: Evento = {
      ...event,
      id: Math.random().toString(36).substr(2, 9),
      minuto: event.minuto
    };

    const currentEvents = pelada.eventos || [];
    return updateLocalData("peladas", peladaId, { eventos: [newEvent, ...currentEvents] }) as Pelada;
  },

  finalizePelada: (peladaId: string) => {
    if (!peladaId) return null;
    const pelada = getItemById("peladas", peladaId) as Pelada | undefined;
    if (!pelada) {
      console.error(`Pelada with ID ${peladaId} not found for finalization.`);
      return null;
    }

    // 1. Record Match Results (Wins/Losses)
    if (pelada.times && pelada.times.length >= 2) {
      const homeTeam = pelada.times[0];
      const awayTeam = pelada.times[1];
      const scoreCasa = pelada.placar_casa || 0;
      const scoreVisitante = pelada.placar_visitante || 0;

      const results: Record<string, 'wins' | 'draws' | 'losses'> = {};
      
      if (scoreCasa > scoreVisitante) {
        homeTeam.jogadores.forEach(j => results[j.jogador_id] = 'wins');
        awayTeam.jogadores.forEach(j => results[j.jogador_id] = 'losses');
      } else if (scoreVisitante > scoreCasa) {
        homeTeam.jogadores.forEach(j => results[j.jogador_id] = 'losses');
        awayTeam.jogadores.forEach(j => results[j.jogador_id] = 'wins');
      } else {
        homeTeam.jogadores.forEach(j => results[j.jogador_id] = 'draws');
        awayTeam.jogadores.forEach(j => results[j.jogador_id] = 'draws');
      }

      Object.entries(results).forEach(([pId, res]) => {
        DataService.updatePlayerStats(pId, { [res]: 1, matchesPlayed: 1 });
      });
    }

    // 2. Process Events (Goals, Assists, Cards)
    const events = pelada.eventos || [];
    const inscritos = pelada.inscritos || [];
    
    events.forEach(e => {
      if (e.tipo === 'gol') {
        DataService.updatePlayerStats(e.jogador_id, { goals: 1 });
        
        // Priority to ID, fallback to finding by name in inscritos
        if (e.assistencia_id) {
          DataService.updatePlayerStats(e.assistencia_id, { assists: 1 });
        } else if (e.assistencia_nome && inscritos.length > 0) {
          const assistant = inscritos.find(i => i.jogador_nome === e.assistencia_nome);
          if (assistant) {
            DataService.updatePlayerStats(assistant.jogador, { assists: 1 });
          }
        }
      } else if (e.tipo === 'cartao_amarelo') {
        DataService.updatePlayerStats(e.jogador_id, { yellowCards: 1 });
      } else if (e.tipo === 'cartao_vermelho') {
        DataService.updatePlayerStats(e.jogador_id, { redCards: 1 });
      }
    });

    return updateLocalData("peladas", peladaId, { status: "finalizada", cronometro_ativo: false }) as Pelada;
  }
};

export default DataService;
