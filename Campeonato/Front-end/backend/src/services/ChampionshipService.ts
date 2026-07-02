import prisma from '../lib/prisma';

export class ChampionshipService {
  async getAll(userId: string) {
    const champs = await prisma.championship.findMany({
      where: { userId },
      include: {
        teams: {
          include: {
            teamPlayers: {
              include: { player: true }
            }
          }
        },
        _count: {
          select: { games: true, teams: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return champs.map(c => ({
      ...c,
      nome: c.name,
      descricao: c.description,
      formato: c.format,
      data_inicio: c.startDate ? c.startDate.toISOString() : c.createdAt.toISOString(),
      data_fim: c.endDate ? c.endDate.toISOString() : c.createdAt.toISOString(),
      jogos_ida_volta: c.jogosIdaVolta,
      criterios_desempate: c.criteriosDesempate ? JSON.parse(c.criteriosDesempate) : [],
      status: c.status,
      times: c.teams.map(t => ({
        id: t.id,
        nome: t.name,
        escudo_url: t.escudoUrl,
        cor: t.color,
        players: [
          ...(t.players ? t.players.split(";").filter(Boolean) : []),
          ...t.teamPlayers.map(tp => tp.player.name)
        ]
      }))
    }));
  }

  async getById(id: string) {
    const champ = await prisma.championship.findUnique({
      where: { id },
      include: {
        teams: {
          include: {
            teamPlayers: {
              include: { player: true }
            }
          }
        },
        games: {
          include: {
            homeTeam: true,
            awayTeam: true
          },
          orderBy: [
            { round: 'asc' },
            { createdAt: 'asc' }
          ]
        }
      }
    });

    if (!champ) return null;

    return {
      ...champ,
      nome: champ.name,
      descricao: champ.description,
      formato: champ.format,
      data_inicio: champ.startDate ? champ.startDate.toISOString() : champ.createdAt.toISOString(),
      data_fim: champ.endDate ? champ.endDate.toISOString() : champ.createdAt.toISOString(),
      jogos_ida_volta: champ.jogosIdaVolta,
      criterios_desempate: champ.criteriosDesempate ? JSON.parse(champ.criteriosDesempate) : [],
      status: champ.status,
      times: champ.teams.map((t, idx) => ({
        id: t.id,
        nome: t.name,
        escudo_url: t.escudoUrl,
        cor: t.color,
        grupo: idx % 2 === 0 ? "A" : "B",
        players: [
          ...(t.players ? t.players.split(";").filter(Boolean) : []),
          ...t.teamPlayers.map(tp => tp.player.name)
        ],
        teamPlayers: t.teamPlayers.map(tp => ({
          id: tp.id,
          playerId: tp.playerId,
          playerName: tp.player.name
        }))
      })),
      jogos: champ.games.map(g => ({
        id: g.id,
        time_casa: g.homeTeamId,
        time_visitante: g.awayTeamId,
        time_casa_nome: g.homeTeam.name,
        time_visitante_nome: g.awayTeam.name,
        gols_casa: g.homeScore,
        gols_visitante: g.awayScore,
        data_hora: g.dateTime ? g.dateTime.toISOString() : g.createdAt.toISOString(),
        status: g.status === 'finalizado' ? 'realizado' : 'agendado',
        round: g.round
      }))
    };
  }

  async create(data: { 
    nome?: string; 
    name?: string; 
    descricao?: string; 
    descricao_cap?: string; 
    data_inicio?: string; 
    data_fim?: string; 
    formato?: string; 
    format?: string;
    jogos_ida_volta?: boolean; 
    jogosIdaVolta?: boolean;
    criterios_desempate?: any; 
    status?: string; 
  }, userId: string) {
    const name = data.name || data.nome || 'Campeonato';
    const description = data.descricao || data.descricao_cap || '';
    const format = data.formato || data.format || 'pontos_corridos';
    const startDate = data.data_inicio ? new Date(data.data_inicio) : new Date();
    const endDate = data.data_fim ? new Date(data.data_fim) : new Date();
    const jogosIdaVolta = data.jogos_ida_volta !== undefined ? data.jogos_ida_volta : false;
    const criteriosDesempate = JSON.stringify(data.criterios_desempate || []);
    const status = data.status || 'rascunho';

    const champ = await prisma.championship.create({
      data: {
        name,
        description,
        startDate,
        endDate,
        format,
        jogosIdaVolta,
        criteriosDesempate,
        status,
        userId
      }
    });

    return {
      ...champ,
      nome: champ.name,
      descricao: champ.description,
      formato: champ.format,
      data_inicio: champ.startDate?.toISOString() || champ.createdAt.toISOString(),
      data_fim: champ.endDate?.toISOString() || champ.createdAt.toISOString(),
      jogos_ida_volta: champ.jogosIdaVolta,
      status: champ.status
    };
  }

  async generateTable(championshipId: string) {
    const champ = await prisma.championship.findUnique({
      where: { id: championshipId },
      include: {
        teams: true
      }
    });

    if (!champ) throw new Error('Championship not found');
    const teams = champ.teams;
    if (teams.length < 2) throw new Error('Need at least 2 teams');

    const isDoubleRound = champ.jogosIdaVolta;
    const format = champ.format; // "pontos_corridos" or "grupos_mata"

    await prisma.championshipGame.deleteMany({ where: { championshipId } });

    const baseDate = champ.startDate ? new Date(champ.startDate) : new Date();
    baseDate.setHours(14, 0, 0, 0);

    const teamBusyTimes: Record<string, Set<number>> = {};
    const getNextAvailableTime = (homeId: string, awayId: string, startFrom: Date): Date => {
      let current = new Date(startFrom);
      current.setMinutes(0, 0, 0);
      
      while (true) {
        const timeVal = current.getTime();
        const homeBusy = teamBusyTimes[homeId]?.has(timeVal);
        const awayBusy = teamBusyTimes[awayId]?.has(timeVal);
        
        if (!homeBusy && !awayBusy) {
          if (!teamBusyTimes[homeId]) teamBusyTimes[homeId] = new Set();
          if (!teamBusyTimes[awayId]) teamBusyTimes[awayId] = new Set();
          teamBusyTimes[homeId].add(timeVal);
          teamBusyTimes[awayId].add(timeVal);
          return current;
        }
        
        // Stagger by 2 hours
        current = new Date(current.getTime() + 2 * 60 * 60 * 1000);
      }
    };

    const gamesData: any[] = [];

    const generateRoundRobin = (targetTeams: any[], roundOffset = 0, isSecondTurn = false) => {
      const teamList = [...targetTeams];
      const numTeams = teamList.length;
      if (numTeams < 2) return;

      const isOdd = numTeams % 2 !== 0;
      if (isOdd) teamList.push({ id: 'BYE', name: 'Folga' } as any);

      const tournamentNumTeams = teamList.length;
      const rounds = tournamentNumTeams - 1;
      const half = tournamentNumTeams / 2;

      for (let r = 1; r <= rounds; r++) {
        const currentRoundNum = r + roundOffset;
        for (let i = 0; i < half; i++) {
          const home = teamList[i];
          const away = teamList[tournamentNumTeams - 1 - i];

          if (home.id !== 'BYE' && away.id !== 'BYE') {
            const homeId = isSecondTurn ? away.id : home.id;
            const awayId = isSecondTurn ? home.id : away.id;

            // schedule round matches on progressive days from baseDate
            const dateForRound = new Date(baseDate.getTime() + (currentRoundNum - 1) * 24 * 60 * 60 * 1000);
            const gameTime = getNextAvailableTime(homeId, awayId, dateForRound);

            gamesData.push({
              championshipId,
              homeTeamId: homeId,
              awayTeamId: awayId,
              round: currentRoundNum,
              status: 'agendado',
              dateTime: gameTime
            });
          }
        }
        // Rotate
        teamList.splice(1, 0, teamList.pop()!);
      }
    };

    if (format === 'grupos_mata') {
      const groupA = teams.filter((_, idx) => idx % 2 === 0);
      const groupB = teams.filter((_, idx) => idx % 2 !== 0);

      generateRoundRobin(groupA, 0, false);
      generateRoundRobin(groupB, 0, false);

      if (isDoubleRound) {
        const grpARounds = groupA.length % 2 === 0 ? groupA.length - 1 : groupA.length;
        const grpBRounds = groupB.length % 2 === 0 ? groupB.length - 1 : groupB.length;
        const maxRounds = Math.max(grpARounds, grpBRounds);

        generateRoundRobin(groupA, maxRounds, true);
        generateRoundRobin(groupB, maxRounds, true);
      }
    } else {
      generateRoundRobin(teams, 0, false);

      if (isDoubleRound) {
        const standardRounds = teams.length % 2 === 0 ? teams.length - 1 : teams.length;
        generateRoundRobin(teams, standardRounds, true);
      }
    }

    await prisma.championshipGame.createMany({
      data: gamesData
    });

    return { message: `${gamesData.length} games generated successfully` };
  }

  async getStandings(championshipId: string) {
    const teams = await prisma.championshipTeam.findMany({
      where: { championshipId },
      include: {
        gamesHome: { where: { status: 'finalizado' } },
        gamesAway: { where: { status: 'finalizado' } }
      }
    });

    const allTeams = await prisma.championshipTeam.findMany({
      where: { championshipId },
      orderBy: { createdAt: 'asc' }
    });

    const standings = teams.map(team => {
      let played = 0, won = 0, drawn = 0, lost = 0, gf = 0, ga = 0, points = 0;

      const processGame = (isHome: boolean, game: any) => {
        played++;
        const teamScore = isHome ? game.homeScore : game.awayScore;
        const opponentScore = isHome ? game.awayScore : game.homeScore;
        gf += teamScore;
        ga += opponentScore;

        if (teamScore > opponentScore) {
          won++;
          points += 3;
        } else if (teamScore === opponentScore) {
          drawn++;
          points += 1;
        } else {
          lost++;
        }
      };

      team.gamesHome.forEach(g => processGame(true, g));
      team.gamesAway.forEach(g => processGame(false, g));

      const teamIdx = allTeams.findIndex(t => t.id === team.id);
      const grupo = teamIdx % 2 === 0 ? 'A' : 'B';

      return {
        id: team.id,
        nome: team.name, 
        grupo,
        pj: played,      
        v: won,         
        e: drawn,       
        d: lost,        
        gp: gf,         
        gc: ga,         
        sg: gf - ga,    
        pts: points     
      };
    });

    return standings.sort((a, b) => b.pts - a.pts || b.sg - a.sg || b.gp - a.gp);
  }

  async getScorers(championshipId: string) {
    const games = await prisma.championshipGame.findMany({
      where: { championshipId },
      select: { id: true }
    });
    const gameIds = games.map(g => g.id);

    const events = await prisma.championshipGameEvent.findMany({
      where: { gameId: { in: gameIds } },
      include: {
        player: true,
        team: true
      }
    });

    const scorersMap: Record<string, { id: string; nome: string; time: string; gols: number }> = {};
    for (const e of events) {
      if (e.type === 'gol') {
        const pId = e.playerId;
        if (!scorersMap[pId]) {
          scorersMap[pId] = {
            id: pId,
            nome: e.player.name,
            time: e.team.name,
            gols: 0
          };
        }
        scorersMap[pId].gols++;
      }
    }
    return Object.values(scorersMap).sort((a, b) => b.gols - a.gols);
  }

  async getCards(championshipId: string) {
    const games = await prisma.championshipGame.findMany({
      where: { championshipId },
      select: { id: true }
    });
    const gameIds = games.map(g => g.id);

    const events = await prisma.championshipGameEvent.findMany({
      where: { gameId: { in: gameIds } },
      include: {
        player: true,
        team: true
      }
    });

    const cardsMap: Record<string, { id: string; nome: string; amarelos: number; vermelhos: number; suspenso: boolean }> = {};
    for (const e of events) {
      if (e.type === 'cartao_amarelo' || e.type === 'cartao_vermelho') {
        const pId = e.playerId;
        if (!cardsMap[pId]) {
          cardsMap[pId] = {
            id: pId,
            nome: e.player.name,
            amarelos: 0,
            vermelhos: 0,
            suspenso: false
          };
        }
        if (e.type === 'cartao_amarelo') {
          cardsMap[pId].amarelos++;
        } else if (e.type === 'cartao_vermelho') {
          cardsMap[pId].vermelhos++;
        }
      }
    }

    for (const pId in cardsMap) {
      const p = cardsMap[pId];
      // 2 amarelos ou 1 vermelho = suspenso
      p.suspenso = (p.amarelos >= 2 || p.vermelhos >= 1);
    }

    return Object.values(cardsMap).sort((a, b) => b.vermelhos - a.vermelhos || b.amarelos - a.amarelos);
  }

  async addTeam(championshipId: string, data: any) {
    const name = typeof data === 'string' ? data : (data.nome || data.name);
    const escudoUrl = data && typeof data === 'object' ? (data.escudo_url || data.escudoUrl) : '';
    const color = data && typeof data === 'object' ? (data.cor || data.color) : 'blue';

    return prisma.championshipTeam.create({
      data: {
        name,
        escudoUrl,
        color,
        championshipId
      }
    });
  }

  async recordResult(championshipId: string, gameId: string, data: any) {
    const { gols_casa, gols_visitante, eventos } = data;

    // Clear old events
    await prisma.championshipGameEvent.deleteMany({
      where: { gameId }
    });

    const champ = await prisma.championship.findUnique({
      where: { id: championshipId }
    });
    if (!champ) throw new Error('Championship not found');
    const userId = champ.userId;

    // Create new events
    if (Array.isArray(eventos)) {
      for (const e of eventos) {
        let validPlayerId = e.jogadorId || e.playerId;
        const nameToUse = e.jogadorNome || e.jogadorName || e.playerName || 'Jogador';
        const teamIdToUse = e.timeId || e.teamId;

        let dbPlayer = null;
        if (validPlayerId && !validPlayerId.startsWith('local_p_')) {
          dbPlayer = await prisma.player.findUnique({
            where: { id: validPlayerId }
          });
        }

        if (!dbPlayer) {
          // Try finding by name for the same user
          dbPlayer = await prisma.player.findFirst({
            where: {
              name: { equals: nameToUse },
              userId
            }
          });
        }

        if (!dbPlayer) {
          // Create the player since they don't exist
          dbPlayer = await prisma.player.create({
            data: {
              name: nameToUse,
              stars: 3.0,
              active: true,
              userId
            }
          });
        }

        // Ensure linked to team
        if (teamIdToUse) {
          const existingLink = await prisma.championshipTeamPlayer.findFirst({
            where: {
              teamId: teamIdToUse,
              playerId: dbPlayer.id
            }
          });
          if (!existingLink) {
            await prisma.championshipTeamPlayer.create({
              data: {
                teamId: teamIdToUse,
                playerId: dbPlayer.id
              }
            });
          }

          const team = await prisma.championshipTeam.findUnique({
            where: { id: teamIdToUse }
          });
          if (team) {
            const playerList = team.players ? team.players.split(";").filter(Boolean) : [];
            if (!playerList.includes(nameToUse)) {
              playerList.push(nameToUse);
              await prisma.championshipTeam.update({
                where: { id: teamIdToUse },
                data: {
                  players: playerList.join(";")
                }
              });
            }
          }
        }

        await prisma.championshipGameEvent.create({
          data: {
            gameId,
            type: e.tipo || e.type,
            playerId: dbPlayer.id,
            teamId: teamIdToUse,
            minute: e.minuto || e.minute || 0
          }
        });
      }
    }

    return prisma.championshipGame.update({
      where: { id: gameId },
      data: {
        homeScore: gols_casa,
        awayScore: gols_visitante,
        status: 'finalizado'
      }
    });
  }

  async updateGameTime(championshipId: string, gameId: string, dateTime: string) {
    return prisma.championshipGame.update({
      where: { id: gameId },
      data: {
        dateTime: new Date(dateTime)
      }
    });
  }

  async addTeamPlayer(championshipId: string, teamId: string, playerName: string) {
    const team = await prisma.championshipTeam.findUnique({
      where: { id: teamId },
      include: { championship: true }
    });
    if (!team) throw new Error('Team not found');

    const userId = team.championship.userId;
    let player = await prisma.player.findFirst({
      where: {
        name: { equals: playerName },
        userId
      }
    });

    if (!player) {
      player = await prisma.player.create({
        data: {
          name: playerName,
          stars: 3.0,
          active: true,
          userId
        }
      });
    }

    const existingLink = await prisma.championshipTeamPlayer.findFirst({
      where: {
        teamId,
        playerId: player.id
      }
    });

    if (!existingLink) {
      await prisma.championshipTeamPlayer.create({
        data: {
          teamId,
          playerId: player.id
        }
      });
    }

    const playerList = team.players ? team.players.split(";").filter(Boolean) : [];
    if (!playerList.includes(playerName)) {
      playerList.push(playerName);
    }

    return prisma.championshipTeam.update({
      where: { id: teamId },
      data: {
        players: playerList.join(";")
      }
    });
  }

  async removeTeamPlayer(championshipId: string, teamId: string, playerName: string) {
    const team = await prisma.championshipTeam.findUnique({
      where: { id: teamId },
      include: { championship: true }
    });
    if (!team) throw new Error('Team not found');

    const userId = team.championship.userId;
    const player = await prisma.player.findFirst({
      where: {
        name: { equals: playerName },
        userId
      }
    });

    if (player) {
      await prisma.championshipTeamPlayer.deleteMany({
        where: {
          teamId,
          playerId: player.id
        }
      });
    }

    let playerList = team.players ? team.players.split(";").filter(Boolean) : [];
    playerList = playerList.filter(p => p !== playerName);

    return prisma.championshipTeam.update({
      where: { id: teamId },
      data: {
        players: playerList.join(";")
      }
    });
  }
}
