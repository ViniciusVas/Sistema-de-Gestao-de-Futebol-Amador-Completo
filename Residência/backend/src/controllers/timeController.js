import { prisma } from "../config/prisma.js";
import { io } from "../server.js";
import { pararCronometroDaPelada } from "./jogoAoVivoController.js";

const criarErroHttp = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;

  return error;
};

const recalcularSomaDoTime = async (db, timeId) => {
  const jogadores = await db.timeJogador.findMany({
    where: {
      time_id: Number(timeId),
    },
    include: {
      jogador: true,
    },
  });

  const soma = jogadores.reduce(
    (acc, item) => acc + Number(item.jogador.nivel_estrelas || 0),
    0
  );

  await db.timePelada.update({
    where: {
      id: Number(timeId),
    },
    data: {
      soma_estrelas: soma,
    },
  });
};

const atualizarEstatisticaDoJogador = async ({
  tx,
  jogadorId,
  gols,
  assistencias,
  resultado,
}) => {
  const estatisticaAtual = await tx.estatisticaJogadorPelada.findUnique({
    where: {
      jogadorId: Number(jogadorId),
    },
  });

  const totalJogos = Number(estatisticaAtual?.totalJogos || 0) + 1;

  const totalGols =
    Number(estatisticaAtual?.totalGols || 0) + Number(gols || 0);

  const totalAssistencias =
    Number(estatisticaAtual?.totalAssistencias || 0) +
    Number(assistencias || 0);

  const totalVitorias =
    Number(estatisticaAtual?.totalVitorias || 0) +
    (resultado === "vitoria" ? 1 : 0);

  const totalEmpates =
    Number(estatisticaAtual?.totalEmpates || 0) +
    (resultado === "empate" ? 1 : 0);

  const totalDerrotas =
    Number(estatisticaAtual?.totalDerrotas || 0) +
    (resultado === "derrota" ? 1 : 0);

  const mediaGols = totalJogos > 0 ? totalGols / totalJogos : 0;

  await tx.estatisticaJogadorPelada.upsert({
    where: {
      jogadorId: Number(jogadorId),
    },
    create: {
      jogadorId: Number(jogadorId),
      totalJogos,
      totalGols,
      totalAssistencias,
      totalVitorias,
      totalEmpates,
      totalDerrotas,
      mediaGols,
    },
    update: {
      totalJogos,
      totalGols,
      totalAssistencias,
      totalVitorias,
      totalEmpates,
      totalDerrotas,
      mediaGols,
    },
  });
};

const processarEstatisticasDoConfronto = async ({
  tx,
  pelada,
  timesEmJogo,
  eventos,
}) => {
  const [time1, time2] = timesEmJogo;

  const placarTime1 = Number(pelada.placar_time1 || 0);
  const placarTime2 = Number(pelada.placar_time2 || 0);

  const jogadoresDaPartida = new Map();

  for (const time of timesEmJogo) {
    for (const vinculo of time.jogadores) {
      jogadoresDaPartida.set(Number(vinculo.jogador_id), {
        jogadorId: Number(vinculo.jogador_id),
        timeId: Number(time.id),
        gols: 0,
        assistencias: 0,
      });
    }
  }

  for (const evento of eventos) {
    if (
      evento.tipo === "gol" &&
      jogadoresDaPartida.has(Number(evento.jogador_id))
    ) {
      const jogador = jogadoresDaPartida.get(Number(evento.jogador_id));
      jogador.gols += 1;
    }

    if (
      evento.tipo === "gol" &&
      evento.jogador_assistencia_id &&
      jogadoresDaPartida.has(Number(evento.jogador_assistencia_id))
    ) {
      const assistente = jogadoresDaPartida.get(
        Number(evento.jogador_assistencia_id)
      );

      assistente.assistencias += 1;
    }
  }

  for (const jogador of jogadoresDaPartida.values()) {
    let resultado = "empate";

    if (placarTime1 > placarTime2) {
      resultado =
        jogador.timeId === Number(time1.id) ? "vitoria" : "derrota";
    }

    if (placarTime2 > placarTime1) {
      resultado =
        jogador.timeId === Number(time2.id) ? "vitoria" : "derrota";
    }

    await atualizarEstatisticaDoJogador({
      tx,
      jogadorId: jogador.jogadorId,
      gols: jogador.gols,
      assistencias: jogador.assistencias,
      resultado,
    });
  }
};

export const listarOrdemTimes = async (req, res) => {
  const { id } = req.params;

  try {
    const times = await prisma.timePelada.findMany({
      where: {
        pelada_id: Number(id),
      },
      include: {
        jogadores: {
          include: {
            jogador: true,
          },
        },
      },
      orderBy: {
        ordem: "asc",
      },
    });

    return res.json(times);
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
};

export const substituirJogador = async (req, res) => {
  try {
    const { jogadorSaiId, jogadorEntraId, timeId } = req.body;

    await prisma.timeJogador.deleteMany({
      where: {
        jogador_id: Number(jogadorEntraId),
      },
    });

    await prisma.timeJogador.deleteMany({
      where: {
        time_id: Number(timeId),
        jogador_id: Number(jogadorSaiId),
      },
    });

    await prisma.timeJogador.create({
      data: {
        time_id: Number(timeId),
        jogador_id: Number(jogadorEntraId),
      },
    });

    await recalcularSomaDoTime(prisma, timeId);

    return res.json({
      message: "Substituição feita corretamente",
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
};

export const rodarTimes = async (req, res) => {
  try {
    const { id } = req.params;
    const { timePerdedorId } = req.body;

    const peladaId = Number(id);
    const timeId = Number(timePerdedorId);

    const pelada = await prisma.pelada.findUnique({
      where: {
        id: peladaId,
      },
    });

    if (!pelada) {
      return res.status(404).json({
        error: "Pelada não encontrada",
      });
    }

    const timePerdedor = await prisma.timePelada.findUnique({
      where: {
        id: timeId,
      },
      include: {
        jogadores: {
          include: {
            jogador: true,
          },
        },
      },
    });

    if (!timePerdedor) {
      return res.status(404).json({
        error: "Time perdedor não encontrado",
      });
    }

    if (Number(timePerdedor.pelada_id) !== peladaId) {
      return res.status(400).json({
        error: "O time informado não pertence a esta pelada",
      });
    }

    const proximoTime = await prisma.timePelada.findFirst({
      where: {
        pelada_id: peladaId,
        em_jogo: false,
      },
      include: {
        jogadores: {
          include: {
            jogador: true,
          },
        },
      },
      orderBy: {
        ordem: "asc",
      },
    });

    if (!proximoTime) {
      return res.json({
        message: "Não há times na fila",
      });
    }

    const quantidadeAtual = proximoTime.jogadores.length;

    const faltam = Math.max(
      0,
      Number(pelada.jogadores_por_time) - quantidadeAtual
    );

    const jogadoresComplemento = timePerdedor.jogadores.slice(0, faltam);

    for (const jogador of jogadoresComplemento) {
      await prisma.timeJogador.update({
        where: {
          id: jogador.id,
        },
        data: {
          time_id: proximoTime.id,
        },
      });
    }

    await prisma.timePelada.update({
      where: {
        id: timePerdedor.id,
      },
      data: {
        em_jogo: false,
      },
    });

    await prisma.timePelada.update({
      where: {
        id: proximoTime.id,
      },
      data: {
        em_jogo: true,
      },
    });

    const times = await prisma.timePelada.findMany({
      where: {
        pelada_id: peladaId,
      },
      orderBy: {
        ordem: "asc",
      },
    });

    const jogando = times.filter(
      (time) =>
        time.em_jogo &&
        Number(time.id) !== Number(timePerdedor.id)
    );

    const fila = times.filter(
      (time) =>
        !time.em_jogo &&
        Number(time.id) !== Number(proximoTime.id) &&
        Number(time.id) !== Number(timePerdedor.id)
    );

    const novaOrdem = [
      ...jogando,
      proximoTime,
      ...fila,
      timePerdedor,
    ];

    let ordem = 1;

    for (const time of novaOrdem) {
      await prisma.timePelada.update({
        where: {
          id: time.id,
        },
        data: {
          ordem: ordem++,
        },
      });
    }

    await recalcularSomaDoTime(prisma, timePerdedor.id);
    await recalcularSomaDoTime(prisma, proximoTime.id);

    return res.json({
      message: "Rotação realizada corretamente",
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
};

export const encerrarPartidaERodar = async (req, res) => {
  const peladaId = Number(req.params.id);

  const timeSaiuId = Number(
    req.body.timeSaiuId ?? req.body.timePerdedorId
  );

  try {
    if (!Number.isInteger(peladaId)) {
      return res.status(400).json({
        error: "Identificador da pelada inválido",
      });
    }

    if (!Number.isInteger(timeSaiuId)) {
      return res.status(400).json({
        error: "Informe o timeSaiuId",
      });
    }

    const peladaInicial = await prisma.pelada.findUnique({
      where: {
        id: peladaId,
      },
    });

    if (!peladaInicial) {
      return res.status(404).json({
        error: "Pelada não encontrada",
      });
    }

    if (peladaInicial.status !== "em_andamento") {
      return res.status(409).json({
        error: "A pelada precisa estar em andamento para encerrar uma partida",
      });
    }

    const timeSaiuVerificacao = await prisma.timePelada.findUnique({
      where: {
        id: timeSaiuId,
      },
    });

    if (
      !timeSaiuVerificacao ||
      Number(timeSaiuVerificacao.pelada_id) !== peladaId ||
      !timeSaiuVerificacao.em_jogo
    ) {
      return res.status(409).json({
        error: "O time informado não está jogando nesta pelada",
      });
    }

    const proximoTimeVerificacao = await prisma.timePelada.findFirst({
      where: {
        pelada_id: peladaId,
        em_jogo: false,
      },
      orderBy: {
        ordem: "asc",
      },
    });

    if (!proximoTimeVerificacao) {
      return res.status(409).json({
        error: "Não há time na fila para entrar em jogo",
      });
    }

    /*
      Interrompe o setInterval do cronômetro antigo antes do reset.
      Isso evita que ele continue diminuindo o tempo da próxima partida.
    */
    pararCronometroDaPelada(peladaId);

    const resultado = await prisma.$transaction(async (tx) => {
      const pelada = await tx.pelada.findUnique({
        where: {
          id: peladaId,
        },
      });

      if (!pelada) {
        throw criarErroHttp("Pelada não encontrada", 404);
      }

      const timesEmJogo = await tx.timePelada.findMany({
        where: {
          pelada_id: peladaId,
          em_jogo: true,
        },
        include: {
          jogadores: true,
        },
        orderBy: {
          ordem: "asc",
        },
      });

      if (timesEmJogo.length !== 2) {
        throw criarErroHttp(
          "É necessário haver exatamente dois times em jogo",
          409
        );
      }

      const timeSaiu = timesEmJogo.find(
        (time) => Number(time.id) === timeSaiuId
      );

      if (!timeSaiu) {
        throw criarErroHttp(
          "O time informado não está jogando nesta partida",
          409
        );
      }

      const proximoTime = await tx.timePelada.findFirst({
        where: {
          pelada_id: peladaId,
          em_jogo: false,
        },
        include: {
          jogadores: true,
        },
        orderBy: {
          ordem: "asc",
        },
      });

      if (!proximoTime) {
        throw criarErroHttp(
          "Não há time na fila para entrar em jogo",
          409
        );
      }

      const eventos = await tx.eventoJogo.findMany({
        where: {
          pelada_id: peladaId,
        },
        select: {
          id: true,
          tipo: true,
          jogador_id: true,
          jogador_assistencia_id: true,
        },
      });

      /*
        Processa os dados antes de apagar os eventos.
        Apenas jogadores dos dois times que estavam em jogo recebem
        partidas, resultado, gols e assistências.
      */
      await processarEstatisticasDoConfronto({
        tx,
        pelada,
        timesEmJogo,
        eventos,
      });

      /*
        Mantém a regra existente: caso o próximo time esteja incompleto,
        ele recebe jogadores do time que saiu.
      */
      const faltamJogadores = Math.max(
        0,
        Number(pelada.jogadores_por_time) -
          Number(proximoTime.jogadores.length)
      );

      const jogadoresComplemento = timeSaiu.jogadores.slice(
        0,
        faltamJogadores
      );

      for (const vinculo of jogadoresComplemento) {
        await tx.timeJogador.update({
          where: {
            id: vinculo.id,
          },
          data: {
            time_id: proximoTime.id,
          },
        });
      }

      await tx.timePelada.update({
        where: {
          id: timeSaiu.id,
        },
        data: {
          em_jogo: false,
        },
      });

      await tx.timePelada.update({
        where: {
          id: proximoTime.id,
        },
        data: {
          em_jogo: true,
        },
      });

      const todosTimes = await tx.timePelada.findMany({
        where: {
          pelada_id: peladaId,
        },
        orderBy: {
          ordem: "asc",
        },
      });

      const timeQuePermanece = todosTimes.filter(
        (time) =>
          time.em_jogo &&
          Number(time.id) !== Number(proximoTime.id)
      );

      const fila = todosTimes.filter(
        (time) =>
          !time.em_jogo &&
          Number(time.id) !== Number(timeSaiu.id)
      );

      const novaOrdem = [
        ...timeQuePermanece,
        ...todosTimes.filter(
          (time) => Number(time.id) === Number(proximoTime.id)
        ),
        ...fila,
        ...todosTimes.filter(
          (time) => Number(time.id) === Number(timeSaiu.id)
        ),
      ];

      for (let index = 0; index < novaOrdem.length; index++) {
        await tx.timePelada.update({
          where: {
            id: novaOrdem[index].id,
          },
          data: {
            ordem: index + 1,
          },
        });
      }

      await recalcularSomaDoTime(tx, timeSaiu.id);
      await recalcularSomaDoTime(tx, proximoTime.id);

      /*
        O resumo da partida acabou. As estatísticas já foram processadas
        antes desta exclusão.
      */
      await tx.eventoJogo.deleteMany({
        where: {
          pelada_id: peladaId,
        },
      });

      await tx.timePelada.updateMany({
        where: {
          pelada_id: peladaId,
        },
        data: {
          gols: 0,
        },
      });

      const tempoInicial = Number(pelada.duracao_minutos || 0) * 60;

      const peladaAtualizada = await tx.pelada.update({
        where: {
          id: peladaId,
        },
        data: {
          placar_time1: 0,
          placar_time2: 0,
          tempo_restante: tempoInicial,
          cronometro_ativo: false,
          status: "em_andamento",
        },
      });

      const timesAtualizados = await tx.timePelada.findMany({
        where: {
          pelada_id: peladaId,
        },
        include: {
          jogadores: {
            include: {
              jogador: true,
            },
          },
        },
        orderBy: {
          ordem: "asc",
        },
      });

      return {
        pelada: peladaAtualizada,
        times: timesAtualizados,
        eventosProcessados: eventos.length,
        timeSaiuId: Number(timeSaiu.id),
        timeEntrouId: Number(proximoTime.id),
      };
    });

    /*
      Mantive io.emit porque seu jogoAoVivoController atual já usa esse padrão.
      A PeladaLive deve filtrar pelo peladaId recebido.
    */
    io.emit("partida:encerrada-e-rodada", {
      peladaId,
      pelada: resultado.pelada,
      times: resultado.times,
      eventos: [],
      placar_time1: 0,
      placar_time2: 0,
      tempo_restante: resultado.pelada.tempo_restante,
      cronometro_ativo: false,
      timeSaiuId: resultado.timeSaiuId,
      timeEntrouId: resultado.timeEntrouId,
    });

    io.emit("placar:atualizar", {
      peladaId,
      placar_time1: 0,
      placar_time2: 0,
    });

    io.emit("cronometro:reiniciar", {
      peladaId,
      tempo_restante: resultado.pelada.tempo_restante,
    });

    return res.status(200).json({
      message:
        "Partida encerrada, estatísticas processadas e próximo time colocado em jogo",
      ...resultado,
    });
  } catch (error) {
    console.error("Erro ao encerrar partida e rodar times:", error);

    return res.status(error.status || 500).json({
      error:
        error.message ||
        "Erro ao encerrar partida e realizar rodízio",
    });
  }
};