import { prisma } from "../config/prisma.js";
import { io } from "../server.js";

export const registrarEvento = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      tipo,
      time_id,
      jogador_id,
      jogador_assistencia_id
    } = req.body;

    const peladaId = Number(id);
    const timeId = Number(time_id);
    const jogadorId = Number(jogador_id);
    const assistenciaId = jogador_assistencia_id
      ? Number(jogador_assistencia_id)
      : null;

    const tiposValidos = [
      "gol",
      "cartao_amarelo",
      "cartao_vermelho"
    ];

    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({
        erro: "Tipo de evento inválido"
      });
    }

    if (assistenciaId && assistenciaId === jogadorId) {
      return res.status(400).json({
        erro: "Jogador não pode dar assistência para si mesmo"
      });
    }

    const pelada = await prisma.pelada.findUnique({
      where: {
        id: peladaId
      }
    });

    if (!pelada) {
      return res.status(404).json({
        erro: "Pelada não encontrada"
      });
    }

    const time = await prisma.timePelada.findUnique({
      where: {
        id: timeId
      }
    });

    if (!time) {
      return res.status(404).json({
        erro: "Time não encontrado"
      });
    }

    if (time.pelada_id !== peladaId) {
      return res.status(400).json({
        erro: "Time não pertence à pelada"
      });
    }

    const jogador = await prisma.jogador.findUnique({
      where: {
        id: jogadorId
      }
    });

    if (!jogador) {
      return res.status(404).json({
        erro: "Jogador não encontrado"
      });
    }

    const jogadorNoTime = await prisma.timeJogador.findFirst({
      where: {
        time_id: timeId,
        jogador_id: jogadorId
      }
    });

    if (!jogadorNoTime) {
      return res.status(400).json({
        erro: "Jogador não pertence ao time informado"
      });
    }

    if (assistenciaId) {
      const assistente = await prisma.jogador.findUnique({
        where: {
          id: assistenciaId
        }
      });

      if (!assistente) {
        return res.status(404).json({
          erro: "Jogador da assistência não encontrado"
        });
      }

      const assistenteNoTime = await prisma.timeJogador.findFirst({
        where: {
          time_id: timeId,
          jogador_id: assistenciaId
        }
      });

      if (!assistenteNoTime) {
        return res.status(400).json({
          erro: "Assistência deve ser de um jogador do mesmo time"
        });
      }
    }

    const minutoAtual = Math.floor(
      (
        Number(pelada.duracao_minutos || 0) * 60 -
        Number(pelada.tempo_restante || 0)
      ) / 60
    );

    const evento = await prisma.eventoJogo.create({
      data: {
        pelada_id: peladaId,
        tipo,
        time_id: timeId,
        jogador_id: jogadorId,
        jogador_assistencia_id: assistenciaId,
        minuto: minutoAtual
      },
      include: {
        jogador: true,
        jogadorAssistencia: true,
        time: true
      }
    });

    if (tipo === "gol") {
      await prisma.timePelada.update({
        where: {
          id: timeId
        },
        data: {
          gols: {
            increment: 1
          }
        }
      });

      const timesJogandoAtualizados = await prisma.timePelada.findMany({
        where: {
          pelada_id: peladaId,
          em_jogo: true
        },
        orderBy: {
          ordem: "asc"
        }
      });

      if (timesJogandoAtualizados.length >= 2) {
        const placarTime1 = Number(timesJogandoAtualizados[0].gols || 0);
        const placarTime2 = Number(timesJogandoAtualizados[1].gols || 0);

        await prisma.pelada.update({
          where: {
            id: peladaId
          },
          data: {
            placar_time1: placarTime1,
            placar_time2: placarTime2
          }
        });

        io.to(`pelada-${peladaId}`).emit("placar:atualizar", {
          peladaId,
          placar_time1: placarTime1,
          placar_time2: placarTime2
        });
      }
    }

    io.to(`pelada-${peladaId}`).emit("evento:novo", evento);

    return res.status(201).json(evento);
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      erro: "Erro ao registrar evento"
    });
  }
};

export const listarEventos = async (req, res) => {
  try {
    const { id } = req.params;

    const eventos = await prisma.eventoJogo.findMany({
      where: {
        pelada_id: Number(id)
      },
      include: {
        jogador: true,
        jogadorAssistencia: true,
        time: true
      },
      orderBy: {
        created_at: "desc"
      }
    });

    return res.json(eventos);
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      erro: "Erro ao listar eventos"
    });
  }
};