import Event from '../models/Event';
import prisma from '../lib/prisma';

export class PeladaService {
  async getAll(userId: string) {
    const peladas = await prisma.pelada.findMany({
      where: { userId },
      include: {
        inscritos: {
          include: { player: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    return peladas.map(p => ({
      ...p,
      titulo: p.title,
      data_hora: p.date.toISOString(),
      local: p.location,
      jogadores_por_time: p.playersPerTeam
    }));
  }

  async getById(id: string) {
    const pelada = await prisma.pelada.findUnique({
      where: { id },
      include: {
        inscritos: {
          include: { player: true },
          orderBy: { checkinOrder: 'asc' }
        },
        times: {
          include: {
            jogadores: true
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!pelada) return null;

    // Map to frontend snake_case format
    return {
      ...pelada,
      titulo: pelada.title,
      data_hora: pelada.date.toISOString(),
      local: pelada.location,
      jogadores_por_time: pelada.playersPerTeam,
      valor_total: pelada.valorTotal,
      config_pagamento_visivel: pelada.configPagamentoVisivel,
      times_jogando: pelada.timesJogando,
      placar_casa: pelada.placarCasa,
      placar_visitante: pelada.placarVisitante,
      cronometro_segundos: pelada.cronometroSegundos,
      cronometro_ativo: pelada.cronometroAtivo,
      inscritos: pelada.inscritos.map(pj => ({
        id: pj.id,
        jogador: pj.playerId,
        jogador_nome: pj.player.name,
        jogador_nivel: pj.player.stars,
        ordem_chegada: pj.checkinOrder,
        presenca_confirmada: pj.presenceConfirmed,
        pagamento_confirmado: pj.paymentConfirmed
      })),
      times: pelada.times.map(t => ({
        id: t.id,
        nome_time: t.name,
        cor: t.color,
        order: t.order,
        soma_estrelas: t.somaEstrelas,
        jogadores: t.jogadores.map(tj => ({
          id: tj.id,
          jogador: tj.playerId,
          jogador_nome: tj.playerName,
          jogador_nivel: tj.playerStars
        }))
      }))
    };
  }

  async create(data: { title: string; date: string; location?: string; playersPerTeam?: number }, userId: string) {
    return prisma.pelada.create({
      data: {
        title: data.title,
        date: new Date(data.date),
        location: data.location,
        playersPerTeam: data.playersPerTeam || 5,
        userId
      }
    });
  }

  async update(id: string, data: any) {
    const updateData: any = {};
    if (data.titulo) updateData.title = data.titulo;
    if (data.data_hora) updateData.date = new Date(data.data_hora);
    if (data.local) updateData.location = data.local;
    if (data.valor_total !== undefined) updateData.valorTotal = data.valor_total;
    if (data.config_pagamento_visivel !== undefined) updateData.configPagamentoVisivel = data.config_pagamento_visivel;
    
    return prisma.pelada.update({
      where: { id },
      data: updateData
    });
  }

  async addPlayer(peladaId: string, playerId: string) {
    // Check if pelada exists
    const pelada = await prisma.pelada.findUnique({ where: { id: peladaId } });
    if (!pelada) throw new Error('Pelada não encontrada');

    // Check if player exists
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new Error('Jogador não encontrado');

    // Check if already in pelada
    const existing = await prisma.peladaJogador.findFirst({
      where: { peladaId, playerId }
    });
    if (existing) throw new Error('Jogador já está na lista desta pelada');

    const lastPlayer = await prisma.peladaJogador.findFirst({
      where: { peladaId },
      orderBy: { checkinOrder: 'desc' }
    });
    const order = (lastPlayer?.checkinOrder || 0) + 1;

    return prisma.peladaJogador.create({
      data: {
        peladaId,
        playerId,
        checkinOrder: order,
        presenceConfirmed: true // Set to true by default when added by organizer
      }
    });
  }

  async removePlayer(peladaJogadorId: string) {
    try {
      return await prisma.peladaJogador.delete({
        where: { id: peladaJogadorId }
      });
    } catch (error) {
      // If id is playerId, find the peladaJogador record
      const pj = await prisma.peladaJogador.findFirst({
        where: { playerId: peladaJogadorId }
      });
      if (pj) {
        return await prisma.peladaJogador.delete({
          where: { id: pj.id }
        });
      }
      throw error;
    }
  }

  async updatePlayer(peladaJogadorId: string, data: any) {
    const updateData: any = {};
    if (data.presenca_confirmada !== undefined) updateData.presenceConfirmed = data.presenca_confirmada;
    if (data.pagamento_confirmado !== undefined) updateData.paymentConfirmed = data.pagamento_confirmado;
    
    return prisma.peladaJogador.update({
      where: { id: peladaJogadorId },
      data: updateData
    });
  }

  async reorderPlayers(peladaId: string, playerIds: string[]) {
    // playerIds is actually an array of playerId (from front-end pj.jogador)
    const updates = playerIds.map((playerId, index) => {
      // We use updateMany because there might be multiple (though shouldn't be with my new check)
      // and it's safer if we don't have the PeladaJogador.id handy
      return prisma.peladaJogador.updateMany({
        where: { peladaId, playerId },
        data: { checkinOrder: index + 1 }
      });
    });
    await Promise.all(updates);
    return this.getById(peladaId);
  }

  async sortTeams(peladaId: string, type: 'aleatorio' | 'balanceado') {
    console.log(`Starting sortTeams for pelada ${peladaId} with type ${type}`);
    const pelada = await prisma.pelada.findUnique({ where: { id: peladaId } });
    if (!pelada) throw new Error('Pelada not found');

    let playersPerTeam = pelada.playersPerTeam || 5;
    if (playersPerTeam < 1) playersPerTeam = 5;

    console.log(`Players per team: ${playersPerTeam}`);

    let confirmedPresences = await prisma.peladaJogador.findMany({
      where: { peladaId, presenceConfirmed: true },
      include: { player: true },
      orderBy: { checkinOrder: 'asc' }
    });

    console.log(`Found ${confirmedPresences.length} confirmed players`);

    if (confirmedPresences.length === 0) {
      console.log('No confirmed players found. Trying all inscribed players.');
      confirmedPresences = await prisma.peladaJogador.findMany({
        where: { peladaId },
        include: { player: true },
        orderBy: { checkinOrder: 'asc' }
      });
      console.log(`Found ${confirmedPresences.length} total players`);
    }

    if (confirmedPresences.length < 2) {
      console.warn(`Not enough players for sorteio in pelada ${peladaId}. Found ${confirmedPresences.length}`);
      throw new Error('Necessário pelo menos 2 jogadores na pelada para o sorteio.');
    }

    const players = confirmedPresences.map(pj => pj.player);
    
    let sortedGroups: any[][] = [];

    if (type === 'aleatorio') {
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffled.length; i += playersPerTeam) {
        sortedGroups.push(shuffled.slice(i, i + playersPerTeam));
      }
    } else {
      const sortedByStars = [...players].sort((a, b) => b.stars - a.stars);
      const numTeams = Math.ceil(players.length / playersPerTeam);
      const teams: { stars: number, players: any[] }[] = Array.from({ length: numTeams }, () => ({ stars: 0, players: [] }));

      sortedByStars.forEach(player => {
        const availableTeams = teams.filter(t => t.players.length < playersPerTeam);
        if (availableTeams.length > 0) {
          availableTeams.sort((a, b) => a.stars - b.stars);
          const targetTeam = availableTeams[0];
          targetTeam.players.push(player);
          targetTeam.stars += player.stars;
        }
      });
      
      let maxDiff = 100;
      let iterations = 0;
      while (maxDiff > 0.5 && iterations < 10) {
        teams.sort((a, b) => a.stars - b.stars);
        const weakest = teams[0];
        const strongest = teams[teams.length - 1];
        maxDiff = strongest.stars - weakest.stars;
        
        if (maxDiff > 0.5) {
          let swapped = false;
          for (const sPlayer of strongest.players) {
            for (const wPlayer of weakest.players) {
              const currentDiff = strongest.stars - weakest.stars;
              const newDiff = (strongest.stars - sPlayer.stars + wPlayer.stars) - (weakest.stars - wPlayer.stars + sPlayer.stars);
              
              if (Math.abs(newDiff) < Math.abs(currentDiff)) {
                const sIdx = strongest.players.indexOf(sPlayer);
                const wIdx = weakest.players.indexOf(wPlayer);
                strongest.players[sIdx] = wPlayer;
                weakest.players[wIdx] = sPlayer;
                strongest.stars = strongest.stars - sPlayer.stars + wPlayer.stars;
                weakest.stars = weakest.stars - wPlayer.stars + sPlayer.stars;
                swapped = true;
                break;
              }
            }
            if (swapped) break;
          }
          if (!swapped) break;
        }
        iterations++;
      }

      sortedGroups = teams.filter(t => t.players.length > 0).map(t => t.players);
    }

    console.log(`Generated ${sortedGroups.length} teams`);

    // Save to DB
    await prisma.$transaction(async (tx) => {
      await tx.timePelada.deleteMany({ where: { peladaId } });
      
      for (let i = 0; i < sortedGroups.length; i++) {
        const somaEstrelas = sortedGroups[i].reduce((sum, p) => sum + p.stars, 0);
        await tx.timePelada.create({
          data: {
            name: `Time ${String.fromCharCode(65 + i)}`,
            order: i + 1,
            somaEstrelas,
            peladaId,
            jogadores: {
              create: sortedGroups[i].map(p => ({
                playerId: p.id,
                playerName: p.name,
                playerStars: p.stars
              }))
            }
          }
        });
      }
    });

    console.log(`Saved teams to DB for pelada ${peladaId}`);
    return this.getById(peladaId);
  }

  async getTeams(peladaId: string) {
    const times = await prisma.timePelada.findMany({
      where: { peladaId },
      include: {
        jogadores: true
      },
      orderBy: { order: 'asc' }
    });

    return times.map(t => ({
      id: t.id,
      nome_time: t.name,
      cor: t.color,
      order: t.order,
      soma_estrelas: t.somaEstrelas,
      jogadores: t.jogadores.map(tj => ({
        id: tj.id,
        jogador: tj.playerId,
        jogador_nome: tj.playerName,
        jogador_nivel: tj.playerStars
      }))
    }));
  }

  async adjustTeams(peladaId: string, times: any[]) {
    // times is an array of { name, order, players: [{id, name, stars}] }
    await prisma.timePelada.deleteMany({ where: { peladaId } });
    
    for (const t of times) {
      const somaEstrelas = t.jogadores.reduce((sum: number, p: any) => sum + (p.jogador_nivel || p.stars || 0), 0);
      await prisma.timePelada.create({
        data: {
          name: t.nome_time || t.name,
          order: t.order,
          somaEstrelas,
          peladaId,
          jogadores: {
            create: t.jogadores.map((p: any) => ({
              playerId: p.jogador || p.id,
              playerName: p.jogador_nome || p.name,
              playerStars: p.jogador_nivel || p.stars
            }))
          }
        }
      });
    }
    return this.getById(peladaId);
  }

  async confirmTeams(peladaId: string) {
    return prisma.pelada.update({
      where: { id: peladaId },
      data: { status: 'em_andamento' }
    });
  }

  async updateMatchState(peladaId: string, data: any) {
    const updateData: any = {};
    if (data.placar_casa !== undefined) updateData.placarCasa = data.placar_casa;
    if (data.placar_visitante !== undefined) updateData.placarVisitante = data.placar_visitante;
    if (data.cronometro_segundos !== undefined) updateData.cronometroSegundos = data.cronometro_segundos;
    if (data.cronometro_ativo !== undefined) updateData.cronometroAtivo = data.cronometro_ativo;
    if (data.times_jogando !== undefined) updateData.timesJogando = data.times_jogando;

    return prisma.pelada.update({
      where: { id: peladaId },
      data: updateData
    });
  }

  async rotateTeams(peladaId: string, timeId?: string) {
    const peladaFull = await prisma.pelada.findUnique({
      where: { id: peladaId },
      include: { 
        times: { 
          include: { jogadores: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!peladaFull || peladaFull.times.length < 2) return this.getById(peladaId);

    const matchTimes = peladaFull.times;
    const homeTeam = matchTimes[0];
    const awayTeam = matchTimes[1];
    const scoreCasa = peladaFull.placarCasa;
    const scoreVisitante = peladaFull.placarVisitante;

    // Helper to update individual stats
    const recordResult = async (playerId: string, result: 'win' | 'draw' | 'loss') => {
      await prisma.playerStats.upsert({
        where: { id: playerId },
        create: {
          id: playerId,
          playerId,
          wins: result === 'win' ? 1 : 0,
          draws: result === 'draw' ? 1 : 0,
          losses: result === 'loss' ? 1 : 0,
          matchesPlayed: 1
        },
        update: {
          wins: result === 'win' ? { increment: 1 } : undefined,
          draws: result === 'draw' ? { increment: 1 } : undefined,
          losses: result === 'loss' ? { increment: 1 } : undefined,
          matchesPlayed: { increment: 1 }
        }
      });
    };

    // Record match results for players currently in court
    if (scoreCasa > scoreVisitante) {
      for (const j of homeTeam.jogadores) await recordResult(j.playerId, 'win');
      for (const j of awayTeam.jogadores) await recordResult(j.playerId, 'loss');
    } else if (scoreVisitante > scoreCasa) {
      for (const j of homeTeam.jogadores) await recordResult(j.playerId, 'loss');
      for (const j of awayTeam.jogadores) await recordResult(j.playerId, 'win');
    } else if (scoreCasa === scoreVisitante && (scoreCasa > 0 || peladaFull.cronometroSegundos > 0)) {
      // Only count as draw if they actually played (score > 0 or time > 0)
      for (const j of homeTeam.jogadores) await recordResult(j.playerId, 'draw');
      for (const j of awayTeam.jogadores) await recordResult(j.playerId, 'draw');
    }

    const times = peladaFull.times;

    // If timeId is provided, move that specific team to the end. 
    // Otherwise move the first team (usual behavior).
    let teamToMove = times[0];
    if (timeId) {
      const found = times.find(t => t.id === timeId);
      if (found) teamToMove = found;
    }

    const otherTimes = times.filter(t => t.id !== teamToMove.id);

    // Update orders for the ones staying: they fill the 1..N-1 slots
    for (let i = 0; i < otherTimes.length; i++) {
      await prisma.timePelada.update({
        where: { id: otherTimes[i].id },
        data: { order: i + 1 }
      });
    }

    // Move the target team to the very end
    await prisma.timePelada.update({
      where: { id: teamToMove.id },
      data: { order: times.length }
    });

    // Reset match state
    await prisma.pelada.update({
      where: { id: peladaId },
      data: { 
        placarCasa: 0, 
        placarVisitante: 0,
        cronometroSegundos: 0,
        cronometroAtivo: false
      }
    });

    return this.getById(peladaId);
  }

  async substitutePlayer(peladaId: string, saiId: string, entraId: string) {
    // saiId is a playerId
    // find the time that has saiId
    const timeJogadorSai = await prisma.timeJogador.findFirst({
      where: { 
        playerId: saiId,
        time: { peladaId }
      }
    });

    if (!timeJogadorSai) throw new Error('Player to leave not found in any team');

    // find details of entraId
    const entraPlayer = await prisma.player.findUnique({ where: { id: entraId } });
    if (!entraPlayer) throw new Error('Player to enter not found');

    // Remove saiId, add entraId to the same time
    await prisma.timeJogador.delete({ where: { id: timeJogadorSai.id } });

    await prisma.timeJogador.create({
      data: {
        timeId: timeJogadorSai.timeId,
        playerId: entraId,
        playerName: entraPlayer.name,
        playerStars: entraPlayer.stars
      }
    });

    // Also need to remove entraId from its current time if it was in one (e.g. next team)
    const timeJogadorEntra = await prisma.timeJogador.findFirst({
      where: {
        playerId: entraId,
        timeId: { not: timeJogadorSai.timeId },
        time: { peladaId }
      }
    });

    if (timeJogadorEntra) {
      // If the player who entered was in another team (likely the next team), 
      // replace them with the player who left (or just leave empty slot for now?)
      // Sprint 6 says "remove jogador e adiciona outro da lista".
      // Usually, if a player from Time 1 comes out and a player from Time 3 comes in, 
      // Time 3 loses a player and Time 1 stays with 5.
      await prisma.timeJogador.delete({ where: { id: timeJogadorEntra.id } });
      
      // Optionally put the leaving player back into the waiting team
      await prisma.timeJogador.create({
        data: {
          timeId: timeJogadorEntra.timeId,
          playerId: saiId,
          playerName: timeJogadorSai.playerName,
          playerStars: timeJogadorSai.playerStars
        }
      });
    }

    // Recalculate sums
    const affectedTimes = await prisma.timePelada.findMany({
      where: { id: { in: [timeJogadorSai.timeId, timeJogadorEntra?.timeId || ''].filter(id => !!id) } },
      include: { jogadores: true }
    });

    for (const t of affectedTimes) {
      const soma = t.jogadores.reduce((sum, j) => sum + (j.playerStars || 0), 0);
      await prisma.timePelada.update({
        where: { id: t.id },
        data: { somaEstrelas: soma }
      });
    }

    return this.getById(peladaId);
  }

  async removeFromTeam(peladaId: string, playerId: string) {
    const timeJogador = await prisma.timeJogador.findFirst({
      where: { 
        playerId,
        time: { peladaId }
      }
    });

    if (timeJogador) {
      await prisma.timeJogador.delete({ where: { id: timeJogador.id } });
      
      // Recalculate sum
      const time = await prisma.timePelada.findUnique({
        where: { id: timeJogador.timeId },
        include: { jogadores: true }
      });
      if (time) {
        const soma = time.jogadores.reduce((sum, j) => sum + (j.playerStars || 0), 0);
        await prisma.timePelada.update({
          where: { id: time.id },
          data: { somaEstrelas: soma }
        });
      }
    }
    return this.getById(peladaId);
  }

  async finalizePelada(peladaId: string) {
    const pelada = await prisma.pelada.findUnique({
      where: { id: peladaId },
      include: { 
        inscritos: true,
        times: {
          include: { jogadores: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!pelada) throw new Error('Pelada not found');
    if (pelada.status === 'finalizada') return { message: 'Already finalized' };

    // Record the result of the final match in progress
    if (pelada.times.length >= 2) {
      const homeTeam = pelada.times[0];
      const awayTeam = pelada.times[1];
      const scoreCasa = pelada.placarCasa;
      const scoreVisitante = pelada.placarVisitante;

      const recordResult = async (playerId: string, result: 'win' | 'draw' | 'loss') => {
        await prisma.playerStats.upsert({
          where: { id: playerId },
          create: {
            id: playerId,
            playerId,
            wins: result === 'win' ? 1 : 0,
            draws: result === 'draw' ? 1 : 0,
            losses: result === 'loss' ? 1 : 0,
            matchesPlayed: 1
          },
          update: {
            wins: result === 'win' ? { increment: 1 } : undefined,
            draws: result === 'draw' ? { increment: 1 } : undefined,
            losses: result === 'loss' ? { increment: 1 } : undefined,
            matchesPlayed: { increment: 1 }
          }
        });
      };

      if (scoreCasa > scoreVisitante) {
        for (const j of homeTeam.jogadores) await recordResult(j.playerId, 'win');
        for (const j of awayTeam.jogadores) await recordResult(j.playerId, 'loss');
      } else if (scoreVisitante > scoreCasa) {
        for (const j of homeTeam.jogadores) await recordResult(j.playerId, 'loss');
        for (const j of awayTeam.jogadores) await recordResult(j.playerId, 'win');
      } else if (scoreCasa === scoreVisitante && (scoreCasa > 0 || pelada.cronometroSegundos > 0)) {
        for (const j of homeTeam.jogadores) await recordResult(j.playerId, 'draw');
        for (const j of awayTeam.jogadores) await recordResult(j.playerId, 'draw');
      }
    }

    // Get all events for this pelada from MongoDB
    const events = await Event.find({ peladaId });

    // Transactionally update player stats (goals, assists, cards)
    for (const pj of pelada.inscritos) {
      const playerEvents = events.filter(e => e.playerId === pj.playerId);
      const assists = events.filter(e => e.assistPlayerId === pj.playerId);

      const goalsCount = playerEvents.filter(e => e.type === 'gol').length;
      const assistCount = assists.length;
      const yellowCount = playerEvents.filter(e => e.type === 'cartao_amarelo').length;
      const redCount = playerEvents.filter(e => e.type === 'cartao_vermelho').length;

      if (goalsCount > 0 || assistCount > 0 || yellowCount > 0 || redCount > 0) {
        await prisma.playerStats.upsert({
          where: { id: pj.playerId },
          create: {
            id: pj.playerId,
            playerId: pj.playerId,
            goals: goalsCount,
            assists: assistCount,
            yellowCards: yellowCount,
            redCards: redCount
          },
          update: {
            goals: { increment: goalsCount },
            assists: { increment: assistCount },
            yellowCards: { increment: yellowCount },
            redCards: { increment: redCount }
          }
        });
      }
    }

    await prisma.pelada.update({
      where: { id: peladaId },
      data: { status: 'finalizada' }
    });

    return { message: 'Pelada finalized and stats updated' };
  }

  async delete(id: string) {
    // Delete events from MongoDB
    await Event.deleteMany({ peladaId: id });
    
    // Delete from Postgres (cascading will handle PeladaJogador, TimePelada, TimeJogador)
    return prisma.pelada.delete({
      where: { id }
    });
  }

  async togglePayment(peladaId: string, peladaJogadorId: string) {
    const pj = await prisma.peladaJogador.findUnique({
      where: { id: peladaJogadorId }
    });
    if (!pj) throw new Error('Inscrição não encontrada');

    return prisma.peladaJogador.update({
      where: { id: peladaJogadorId },
      data: { paymentConfirmed: !pj.paymentConfirmed }
    });
  }

  async getRateio(peladaId: string) {
    const pelada = await prisma.pelada.findUnique({
      where: { id: peladaId },
      include: {
        inscritos: {
          where: { presenceConfirmed: true }
        }
      }
    });

    if (!pelada) throw new Error('Pelada não encontrada');

    const total = pelada.valorTotal || 0;
    const numPagantes = pelada.inscritos.length;
    const valorPorPessoa = numPagantes > 0 ? total / numPagantes : 0;

    return {
      total,
      num_pagantes: numPagantes,
      valor_por_pessoa: valorPorPessoa
    };
  }
}
