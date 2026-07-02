import { prisma } from "../config/prisma.js";

export const processarEstatisticasPelada = async (peladaId) => {

  const pelada = await prisma.pelada.findUnique({
    where: {
      id: Number(peladaId)
    },

    include: {
      times: {
        include: {
          jogadores: {
            include: {
              jogador: true
            }
          }
        }
      },

      eventos: true
    }
  });

  if (!pelada) {
    throw new Error("Pelada não encontrada");
  }

  // impedir duplicação
  if (pelada.status === "encerrada") {
    throw new Error("Pelada já encerrada");
  }

  const eventos = pelada.eventos;

  // contar gols por time
  const golsPorTime = {};

  for (const evento of eventos) {

    if (evento.tipo === "gol") {

      golsPorTime[evento.time_id] =
        (golsPorTime[evento.time_id] || 0) + 1;
    }
  }

  // processar cada time
  for (const time of pelada.times) {

    const golsTime =
      golsPorTime[time.id] || 0;

    const outroTime =
      pelada.times.find(t => t.id !== time.id);

    const golsAdversario =
      golsPorTime[outroTime?.id] || 0;

    for (const jogadorTime of time.jogadores) {

      const jogadorId =
        jogadorTime.jogador.id;

      // gols
      const gols = eventos.filter(e =>
        e.tipo === "gol" &&
        e.jogador_id === jogadorId
      ).length;

      // assistências
      const assistencias = eventos.filter(e =>
        e.tipo === "gol" &&
        e.jogador_assistencia_id === jogadorId
      ).length;

      let vitorias = 0;
      let empates = 0;
      let derrotas = 0;

      if (golsTime > golsAdversario) {

        vitorias = 1;

      } else if (golsTime < golsAdversario) {

        derrotas = 1;

      } else {

        empates = 1;
      }

      // buscar estatística
      let estatistica =
        await prisma.estatisticaJogadorPelada.findUnique({
          where: {
            jogadorId
          }
        });

      // criar se não existir
      if (!estatistica) {

        estatistica =
          await prisma.estatisticaJogadorPelada.create({
            data: {
              jogadorId
            }
          });
      }

      const totalJogos =
        estatistica.totalJogos + 1;

      const totalGols =
        estatistica.totalGols + gols;

      const mediaGols =
        totalJogos > 0
          ? totalGols / totalJogos
          : 0;

      await prisma.estatisticaJogadorPelada.update({
        where: {
          jogadorId
        },

        data: {

          totalJogos: {
            increment: 1
          },

          totalGols: {
            increment: gols
          },

          totalAssistencias: {
            increment: assistencias
          },

          totalVitorias: {
            increment: vitorias
          },

          totalEmpates: {
            increment: empates
          },

          totalDerrotas: {
            increment: derrotas
          },

          mediaGols
        }
      });
    }
  }

  // finalizar pelada
  await prisma.pelada.update({
    where: {
      id: Number(peladaId)
    },

    data: {
      status: "encerrada"
    }
  });

  return true;
};

export const buscarEstatisticasJogador = async (jogadorId) => {

  const jogador = await prisma.jogador.findUnique({
    where: {
      id: Number(jogadorId)
    },

    include: {
      estatisticasPelada: true
    }
  });

  if (!jogador) {
    throw new Error("Jogador não encontrado");
  }

  return jogador;
};