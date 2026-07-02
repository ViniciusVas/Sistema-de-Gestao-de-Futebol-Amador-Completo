import { prisma } from "../config/prisma.js";

// CRIAR PELADA
export const criarPelada = async (req, res) => {
  try {
    const pelada = await prisma.pelada.create({
      data: {
        titulo: req.body.titulo,
        data_hora: new Date(req.body.data_hora),
        local: req.body.local,
        duracao_minutos: req.body.duracao_minutos,
        jogadores_por_time: req.body.jogadores_por_time,
        times_simultaneos: req.body.times_simultaneos,
        valor_por_jogador: req.body.valor_por_jogador,
        organizador: {
          connect: { id: req.user.id }
        }
      }
    });

    res.status(201).json(pelada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// LISTAR PELADAS
export const listarPeladas = async (req, res) => {
  try {
    const peladas = await prisma.pelada.findMany({
      where: {
        organizador_id: req.user.id
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json(peladas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DETALHAR PELADA
export const detalharPelada = async (req, res) => {
  const { id } = req.params;

  try {
    const pelada = await prisma.pelada.findUnique({
      where: { id: Number(id) },
      include: {
        jogadores: {
          include: {
            jogador: true
          },
          orderBy: {
            ordem_chegada: "asc"
          }
        }
      }
    });

    if (!pelada) {
      return res.status(404).json({ error: "Pelada não encontrada" });
    }

    // TRANSFORMAÇÃO PARA O FRONTEND
    const inscritos = pelada.jogadores.map(pj => ({
      id: pj.id,
      jogador: pj.jogador_id,
      jogador_nome: pj.jogador.nome,
      jogador_nivel: pj.jogador.nivel_estrelas,
      ordem_chegada: pj.ordem_chegada,
      presenca_confirmada: pj.presenca_confirmada,
      pagamento_confirmado: pj.pagamento_confirmado
    }));

    res.json({
      id: pelada.id,
      titulo: pelada.titulo,
      data_hora: pelada.data_hora,
      local: pelada.local,
      status: pelada.status,
      inscritos
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ADICIONAR JOGADOR
export const adicionarJogador = async (req, res) => {
  const { id } = req.params;
  const { jogador_id } = req.body;

  try {
    const existe = await prisma.peladaJogador.findUnique({
      where: {
        pelada_id_jogador_id: {
          pelada_id: Number(id),
          jogador_id: Number(jogador_id)
        }
      }
    });

    if (existe) {
      return res.status(400).json({ error: "Jogador já está na pelada" });
    }

    const ultimo = await prisma.peladaJogador.findFirst({
      where: { pelada_id: Number(id) },
      orderBy: { ordem_chegada: "desc" }
    });

    const novaOrdem = ultimo ? ultimo.ordem_chegada + 1 : 1;

    const relacao = await prisma.peladaJogador.create({
      data: {
        pelada_id: Number(id),
        jogador_id: Number(jogador_id),
        ordem_chegada: novaOrdem
      }
    });

    res.status(201).json(relacao);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// REMOVER JOGADOR
export const removerJogador = async (req, res) => {
  const { id, jogadorId } = req.params;

  try {
    await prisma.peladaJogador.delete({
      where: {
        pelada_id_jogador_id: {
          pelada_id: Number(id),
          jogador_id: Number(jogadorId)
        }
      }
    });

    res.json({ message: "Removido" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// REORDENAR JOGADORES
export const reordenar = async (req, res) => {
  const { id } = req.params;
  const { ordem } = req.body; // array de jogador_id

  try {
    const updates = ordem.map((jogadorId, index) =>
      prisma.peladaJogador.update({
        where: {
          pelada_id_jogador_id: {
            pelada_id: Number(id),
            jogador_id: Number(jogadorId)
          }
        },
        data: {
          ordem_chegada: index + 1
        }
      })
    );

    await prisma.$transaction(updates);

    res.json({ message: "Reordenado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CONFIRMAR PRESENÇA
export const confirmarPresenca = async (req, res) => {
  const { id } = req.params;
  const { jogador_id, confirmar } = req.body;

  try {
    await prisma.peladaJogador.update({
      where: {
        pelada_id_jogador_id: {
          pelada_id: Number(id),
          jogador_id: Number(jogador_id)
        }
      },
      data: {
        presenca_confirmada: confirmar
      }
    });

    res.json({ message: "Presença atualizada" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const atualizarPelada = async (req, res) => {
  const { id } = req.params;

  try {
    const peladaId = Number(id);

    const peladaExistente = await prisma.pelada.findUnique({
      where: {
        id: peladaId,
      },
    });

    if (!peladaExistente) {
      return res.status(404).json({
        error: "Pelada não encontrada",
      });
    }

    if (peladaExistente.organizador_id !== req.user.id) {
      return res.status(403).json({
        error: "Você não tem permissão para atualizar esta pelada",
      });
    }

    const {
      titulo,
      data_hora,
      local,
      duracao_minutos,
      jogadores_por_time,
      times_simultaneos,
      valor_por_jogador,
      config_pagamento_visivel,
    } = req.body;

    const dadosAtualizacao = {};

    if (titulo !== undefined) {
      dadosAtualizacao.titulo = titulo;
    }

    if (data_hora !== undefined) {
      const dataConvertida = new Date(data_hora);

      if (Number.isNaN(dataConvertida.getTime())) {
        return res.status(400).json({
          error: "Data e hora inválidas",
        });
      }

      dadosAtualizacao.data_hora = dataConvertida;
    }

    if (local !== undefined) {
      dadosAtualizacao.local = local;
    }

    if (duracao_minutos !== undefined) {
      dadosAtualizacao.duracao_minutos = Number(duracao_minutos);
    }

    if (jogadores_por_time !== undefined) {
      dadosAtualizacao.jogadores_por_time = Number(jogadores_por_time);
    }

    if (times_simultaneos !== undefined) {
      dadosAtualizacao.times_simultaneos = Number(times_simultaneos);
    }

    if (valor_por_jogador !== undefined) {
      dadosAtualizacao.valor_por_jogador = Number(valor_por_jogador);
    }

    if (config_pagamento_visivel !== undefined) {
      dadosAtualizacao.config_pagamento_visivel = Boolean(
        config_pagamento_visivel
      );
    }

    if (Object.keys(dadosAtualizacao).length === 0) {
      return res.status(400).json({
        error: "Nenhum campo válido enviado para atualização",
      });
    }

    const peladaAtualizada = await prisma.pelada.update({
      where: {
        id: peladaId,
      },
      data: dadosAtualizacao,
    });

    return res.json(peladaAtualizada);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erro ao atualizar pelada",
    });
  }
};