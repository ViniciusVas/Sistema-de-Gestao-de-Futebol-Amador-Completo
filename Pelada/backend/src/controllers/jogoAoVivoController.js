import { prisma } from "../config/prisma.js";
import { io } from "../server.js";

const intervalosCronometro = {};

export const pararCronometroDaPelada = (peladaId) => {
  const chave = String(peladaId);

  if (intervalosCronometro[chave]) {
    clearInterval(intervalosCronometro[chave]);
  }

  delete intervalosCronometro[chave];
};

export const iniciarCronometro = async (req, res) => {
  try {
    const peladaId = Number(req.params.id);

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

    let tempoRestante =
      pelada.tempo_restante ?? Number(pelada.duracao_minutos || 0) * 60;

    await prisma.pelada.update({
      where: {
        id: peladaId,
      },
      data: {
        cronometro_ativo: true,
        tempo_restante: tempoRestante,
      },
    });

    // Garante que nunca existam dois cronômetros para a mesma pelada.
    pararCronometroDaPelada(peladaId);

    intervalosCronometro[String(peladaId)] = setInterval(async () => {
      try {
        tempoRestante = Math.max(tempoRestante - 1, 0);

        await prisma.pelada.update({
          where: {
            id: peladaId,
          },
          data: {
            tempo_restante: tempoRestante,
          },
        });

        io.emit("cronometro:atualizar", {
          peladaId,
          tempo_restante: tempoRestante,
        });

        if (tempoRestante <= 0) {
          pararCronometroDaPelada(peladaId);

          await prisma.pelada.update({
            where: {
              id: peladaId,
            },
            data: {
              cronometro_ativo: false,
              tempo_restante: 0,
            },
          });

          io.emit("cronometro:finalizado", {
            peladaId,
          });
        }
      } catch (error) {
        console.error("Erro no cronômetro da pelada:", error);

        // Evita que um intervalo com erro continue rodando indefinidamente.
        pararCronometroDaPelada(peladaId);
      }
    }, 1000);

    io.emit("cronometro:iniciar", {
      peladaId,
      tempo_restante: tempoRestante,
    });

    return res.json({
      message: "Cronômetro iniciado",
    });
  } catch (error) {
    console.error("Erro ao iniciar cronômetro:", error);

    return res.status(500).json({
      error: error.message || "Erro ao iniciar cronômetro",
    });
  }
};

export const pausarCronometro = async (req, res) => {
  try {
    const peladaId = Number(req.params.id);

    pararCronometroDaPelada(peladaId);

    await prisma.pelada.update({
      where: {
        id: peladaId,
      },
      data: {
        cronometro_ativo: false,
      },
    });

    io.emit("cronometro:pausar", {
      peladaId,
    });

    return res.json({
      message: "Cronômetro pausado",
    });
  } catch (error) {
    console.error("Erro ao pausar cronômetro:", error);

    return res.status(500).json({
      error: error.message || "Erro ao pausar cronômetro",
    });
  }
};

export const reiniciarCronometro = async (req, res) => {
  try {
    const peladaId = Number(req.params.id);

    pararCronometroDaPelada(peladaId);

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

    const tempoInicial = Number(pelada.duracao_minutos || 0) * 60;

    await prisma.pelada.update({
      where: {
        id: peladaId,
      },
      data: {
        cronometro_ativo: false,
        tempo_restante: tempoInicial,
      },
    });

    io.emit("cronometro:reiniciar", {
      peladaId,
      tempo_restante: tempoInicial,
    });

    return res.json({
      message: "Cronômetro reiniciado",
    });
  } catch (error) {
    console.error("Erro ao reiniciar cronômetro:", error);

    return res.status(500).json({
      error: error.message || "Erro ao reiniciar cronômetro",
    });
  }
};

export const atualizarPlacar = async (req, res) => {
  try {
    const peladaId = Number(req.params.id);
    const time = Number(req.body.time);
    const gols = Number(req.body.gols);

    if (time !== 1 && time !== 2) {
      return res.status(400).json({
        error: "O campo time deve ser 1 ou 2",
      });
    }

    if (!Number.isFinite(gols) || gols < 0) {
      return res.status(400).json({
        error: "A quantidade de gols deve ser um número válido maior ou igual a zero",
      });
    }

    const campo = time === 1 ? "placar_time1" : "placar_time2";

    const pelada = await prisma.pelada.update({
      where: {
        id: peladaId,
      },
      data: {
        [campo]: gols,
      },
    });

    io.emit("placar:atualizar", {
      peladaId: pelada.id,
      placar_time1: pelada.placar_time1,
      placar_time2: pelada.placar_time2,
    });

    return res.json(pelada);
  } catch (error) {
    console.error("Erro ao atualizar placar:", error);

    return res.status(500).json({
      error: error.message || "Erro ao atualizar placar",
    });
  }
};