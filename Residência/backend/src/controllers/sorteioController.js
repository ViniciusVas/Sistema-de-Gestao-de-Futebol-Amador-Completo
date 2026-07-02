import { prisma } from "../config/prisma.js";
import {
  sortearAleatorio,
  sortearBalanceado
} from "../utils/sorteio.js";

export const sortearTimes = async (req, res) => {
  const { id } = req.params;
  const { tipo } = req.query;

  try {
    const peladaId = Number(id);

    // 🔥 buscar somente confirmados
    const peladaJogadores =
      await prisma.peladaJogador.findMany({
        where: {
          pelada_id: peladaId,
          presenca_confirmada: true
        },
        include: {
          jogador: true
        }
      });

    if (peladaJogadores.length === 0) {
      return res.status(400).json({
        error: "Nenhum jogador confirmado"
      });
    }

    // 🔥 buscar pelada
    const pelada = await prisma.pelada.findUnique({
      where: {
        id: peladaId
      }
    });

    if (!pelada) {
      return res.status(404).json({
        error: "Pelada não encontrada"
      });
    }

    // 🔥 quantidade máxima jogando
    const limiteJogando =
      pelada.jogadores_por_time *
      pelada.times_simultaneos;

    // 🔥 ordenar por chegada
    const jogadoresOrdenados =
      peladaJogadores
        .sort(
          (a, b) =>
            a.ordem_chegada -
            b.ordem_chegada
        )
        .map((pj) => pj.jogador);

    // 🔥 jogadores principais
    const jogadoresParaTimes =
      jogadoresOrdenados.slice(
        0,
        limiteJogando
      );

    // 🔥 fila
    const jogadoresFila =
      jogadoresOrdenados.slice(
        limiteJogando
      );

    // 🔥 gerar times
    let resultado =
      tipo === "balanceado"
        ? sortearBalanceado(
            jogadoresParaTimes,
            pelada.times_simultaneos,
            pelada.jogadores_por_time
          )
        : sortearAleatorio(
            jogadoresParaTimes,
            pelada.times_simultaneos,
            pelada.jogadores_por_time
          );

    // 🔥 limpar dados antigos da pelada
    await prisma.$transaction([
      // apagar eventos antigos
      prisma.eventoJogo.deleteMany({
        where: {
          pelada_id: peladaId
        }
      }),

      // resetar placar e cronômetro
      prisma.pelada.update({
        where: {
          id: peladaId
        },
        data: {
          placar_time1: 0,
          placar_time2: 0,
          tempo_restante: null,
          cronometro_ativo: false
        }
      }),

      // apagar vínculos dos jogadores
      prisma.timeJogador.deleteMany({
        where: {
          time: {
            pelada_id: peladaId
          }
        }
      }),

      // apagar times antigos
      prisma.timePelada.deleteMany({
        where: {
          pelada_id: peladaId
        }
      })
    ]);

    const timesCriados = [];

    // 🔥 criar times principais
    for (let i = 0; i < resultado.length; i++) {
      const jogadoresTime =
        tipo === "balanceado"
          ? resultado[i].jogadores
          : resultado[i];

      const soma = jogadoresTime.reduce(
        (acc, jogador) =>
          acc + jogador.nivel_estrelas,
        0
      );

      const time =
        await prisma.timePelada.create({
          data: {
            nome_time: `Time ${i + 1}`,
            soma_estrelas: soma,
            pelada_id: peladaId,
            ordem: i + 1,
            em_jogo: true
          }
        });

      for (const jogador of jogadoresTime) {
        await prisma.timeJogador.create({
          data: {
            time_id: time.id,
            jogador_id: jogador.id
          }
        });
      }

      timesCriados.push(time);
    }

    // 🔥 criar fila
    let contador = resultado.length;

    const fila = [...jogadoresFila];

    while (fila.length > 0) {
      const grupo = fila.splice(
        0,
        pelada.jogadores_por_time
      );

      const soma = grupo.reduce(
        (acc, jogador) =>
          acc + jogador.nivel_estrelas,
        0
      );

      contador++;

      const time =
        await prisma.timePelada.create({
          data: {
            nome_time: `Time ${contador}`,
            soma_estrelas: soma,
            pelada_id: peladaId,
            ordem: contador,
            em_jogo: false
          }
        });

      for (const jogador of grupo) {
        await prisma.timeJogador.create({
          data: {
            time_id: time.id,
            jogador_id: jogador.id
          }
        });
      }

      timesCriados.push(time);
    }

    res.json({
      message: "Times sorteados com sucesso",
      times: timesCriados
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};

export const listarTimes = async (req, res) => {
  const { id } = req.params;

  try {
    const times =
      await prisma.timePelada.findMany({
        where: {
          pelada_id: Number(id)
        },
        include: {
          jogadores: {
            include: {
              jogador: true
            }
          }
        },
        orderBy: {
          ordem: "asc"
        }
      });

    res.json(times);

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};

export const ajustarTimes = async (req, res) => {
  const {
    jogadorId,
    novoTimeId,
    peladaId
  } = req.body;

  try {
    const registro =
      await prisma.timeJogador.findFirst({
        where: {
          jogador_id: jogadorId,
          time: {
            pelada_id: peladaId
          }
        }
      });

    if (!registro) {
      return res.status(404).json({
        error:
          "Jogador não está em nenhum time"
      });
    }

    const timeAntigoId = registro.time_id;

    // 🔥 mover jogador
    await prisma.timeJogador.update({
      where: {
        id: registro.id
      },
      data: {
        time_id: novoTimeId
      }
    });

    // 🔥 recalcular soma
    const recalcularSoma = async (
      timeId
    ) => {
      const jogadores =
        await prisma.timeJogador.findMany({
          where: {
            time_id: timeId
          },
          include: {
            jogador: true
          }
        });

      const soma = jogadores.reduce(
        (acc, j) =>
          acc +
          j.jogador.nivel_estrelas,
        0
      );

      await prisma.timePelada.update({
        where: {
          id: timeId
        },
        data: {
          soma_estrelas: soma
        }
      });
    };

    await recalcularSoma(timeAntigoId);
    await recalcularSoma(novoTimeId);

    res.json({
      message:
        "Jogador movido com sucesso"
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};

export const confirmarTimes = async (
  req,
  res
) => {
  const { id } = req.params;

  try {
    const peladaId = Number(id);

    // 🔥 atualizar status
    const pelada =
      await prisma.pelada.update({
        where: {
          id: peladaId
        },
        data: {
          status: "em_andamento"
        }
      });

    // 🔥 buscar times ordenados
    const times =
      await prisma.timePelada.findMany({
        where: {
          pelada_id: peladaId
        },
        orderBy: {
          ordem: "asc"
        }
      });

    // 🔥 atualizar fila e quem está jogando
    for (let i = 0; i < times.length; i++) {
      await prisma.timePelada.update({
        where: {
          id: times[i].id
        },
        data: {
          ordem: i + 1,
          em_jogo:
            i <
            pelada.times_simultaneos
        }
      });
    }

    res.json({
      message:
        "Times confirmados corretamente"
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};

const criarErro = (mensagem, status = 400) => {
  const error = new Error(mensagem);
  error.status = status;
  return error;
};

const obterIdJogadorDoSnapshot = (item) => {
  if (typeof item === "number" || typeof item === "string") {
    return Number(item);
  }

  return Number(
    item?.jogador_id ??
      item?.jogador?.id ??
      item?.id
  );
};

export const restaurarTimes = async (req, res) => {
  const { id } = req.params;
  const { times } = req.body;

  const peladaId = Number(id);

  try {
    if (!Array.isArray(times) || times.length === 0) {
      return res.status(400).json({
        error: "Envie ao menos um time para restaurar"
      });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const pelada = await tx.pelada.findUnique({
        where: {
          id: peladaId
        }
      });

      if (!pelada) {
        throw criarErro("Pelada não encontrada", 404);
      }

      /*
        Desfazer a formação só é permitido antes da confirmação dos times.
        Depois de iniciar a pelada, a escalação já pode ter sido usada
        em eventos, placar, rodízio e estatísticas.
      */
      if (pelada.status !== "agendada") {
        throw criarErro(
          "Não é possível desfazer times após a confirmação ou início da pelada",
          409
        );
      }

      const timesNormalizados = times
        .map((time, index) => {
          const jogadores = Array.isArray(time.jogadores)
            ? time.jogadores
                .map(obterIdJogadorDoSnapshot)
                .filter((jogadorId) => Number.isInteger(jogadorId))
            : [];

          return {
            nome_time: time.nome_time || `Time ${index + 1}`,
            cor: time.cor || null,
            ordem: Number(time.ordem || index + 1),
            em_jogo: Boolean(time.em_jogo),
            jogadores
          };
        })
        .sort((a, b) => a.ordem - b.ordem);

      const possuiTimeVazio = timesNormalizados.some(
        (time) => time.jogadores.length === 0
      );

      if (possuiTimeVazio) {
        throw criarErro(
          "Não é possível restaurar um time sem jogadores"
        );
      }

      const todosJogadoresIds = timesNormalizados.flatMap(
        (time) => time.jogadores
      );

      const idsDuplicados = todosJogadoresIds.some(
        (jogadorId, index) =>
          todosJogadoresIds.indexOf(jogadorId) !== index
      );

      if (idsDuplicados) {
        throw criarErro(
          "Um jogador não pode estar em mais de um time"
        );
      }

      const quantidadeTimesJogando = timesNormalizados.filter(
        (time) => time.em_jogo
      ).length;

      if (quantidadeTimesJogando > pelada.times_simultaneos) {
        throw criarErro(
          `A pelada permite no máximo ${pelada.times_simultaneos} times jogando ao mesmo tempo`
        );
      }

      const jogadoresConfirmados = await tx.peladaJogador.findMany({
        where: {
          pelada_id: peladaId,
          presenca_confirmada: true,
          jogador_id: {
            in: todosJogadoresIds
          }
        },
        select: {
          jogador_id: true,
          jogador: {
            select: {
              id: true,
              nivel_estrelas: true
            }
          }
        }
      });

      if (jogadoresConfirmados.length !== todosJogadoresIds.length) {
        throw criarErro(
          "O histórico contém jogador não confirmado ou que não pertence a esta pelada"
        );
      }

      const dadosJogadores = new Map(
        jogadoresConfirmados.map((registro) => [
          registro.jogador_id,
          registro.jogador
        ])
      );

      /*
        A restauração acontece apenas na fase de sorteio.
        Mesmo assim, removemos qualquer evento e resetamos os dados de jogo
        para manter a pelada em um estado consistente.
      */
      await tx.eventoJogo.deleteMany({
        where: {
          pelada_id: peladaId
        }
      });

      await tx.timeJogador.deleteMany({
        where: {
          time: {
            pelada_id: peladaId
          }
        }
      });

      await tx.timePelada.deleteMany({
        where: {
          pelada_id: peladaId
        }
      });

      const timesCriados = [];

      for (let index = 0; index < timesNormalizados.length; index++) {
        const timeSnapshot = timesNormalizados[index];

        const somaEstrelas = timeSnapshot.jogadores.reduce(
          (total, jogadorId) => {
            const jogador = dadosJogadores.get(jogadorId);

            return total + Number(jogador?.nivel_estrelas || 0);
          },
          0
        );

        const timeCriado = await tx.timePelada.create({
          data: {
            nome_time: timeSnapshot.nome_time,
            cor: timeSnapshot.cor,
            soma_estrelas: somaEstrelas,
            pelada_id: peladaId,
            gols: 0,
            ordem: index + 1,
            em_jogo: timeSnapshot.em_jogo,
            jogadores: {
              create: timeSnapshot.jogadores.map((jogadorId) => ({
                jogador_id: jogadorId
              }))
            }
          },
          include: {
            jogadores: {
              include: {
                jogador: true
              }
            }
          }
        });

        timesCriados.push(timeCriado);
      }

      await tx.pelada.update({
        where: {
          id: peladaId
        },
        data: {
          placar_time1: 0,
          placar_time2: 0,
          tempo_restante: null,
          cronometro_ativo: false
        }
      });

      return timesCriados;
    });

    return res.json({
      message: "Formação anterior restaurada com sucesso",
      times: resultado
    });
  } catch (error) {
    console.error("Erro ao restaurar times:", error);

    return res.status(error.status || 500).json({
      error: error.message || "Erro ao restaurar formação dos times"
    });
  }
};