import { prisma } from "../config/prisma.js";

export const listarPagamentos = async (req, res) => {
  try {
    const { id } = req.params;

    const pelada = await prisma.pelada.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        jogadores: {
          include: {
            jogador: true,
          },
          orderBy: {
            ordem_chegada: "asc",
          },
        },
      },
    });

    if (!pelada) {
      return res.status(404).json({
        erro: "Pelada não encontrada",
      });
    }

    return res.json({
      config_pagamento_visivel: pelada.config_pagamento_visivel,
      jogadores: pelada.jogadores,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao listar pagamentos",
    });
  }
};

export const atualizarPagamento = async (req, res) => {
  try {
    const { id, jogador_id } = req.params;

    const { pagamento_confirmado } = req.body;

    const pagamento = await prisma.peladaJogador.update({
      where: {
        pelada_id_jogador_id: {
          pelada_id: Number(id),
          jogador_id: Number(jogador_id),
        },
      },
      data: {
        pagamento_confirmado,
      },
    });

    return res.json(pagamento);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao atualizar pagamento",
    });
  }
};

export const calcularRateio = async (req, res) => {
  try {
    const { id } = req.params;

    const pelada = await prisma.pelada.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        jogadores: true,
      },
    });

    if (!pelada) {
      return res.status(404).json({
        erro: "Pelada não encontrada",
      });
    }

    const presentes = pelada.jogadores.filter(
      (jogador) => jogador.presenca_confirmada
    );

    const quantidadePresentes = presentes.length;

    const valorPorJogador =
      pelada.valor_por_jogador || 0;

    const valorTotal =
      quantidadePresentes * valorPorJogador;

    return res.json({
      quantidade_presentes: quantidadePresentes,
      valor_por_jogador: valorPorJogador,
      valor_total: valorTotal,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao calcular rateio",
    });
  }
};

export const atualizarConfigPagamento = async (req, res) => {
  try {
    const { id } = req.params;

    const { config_pagamento_visivel } = req.body;

    const pelada = await prisma.pelada.update({
      where: {
        id: Number(id),
      },
      data: {
        config_pagamento_visivel,
      },
    });

    return res.json(pelada);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao atualizar configuração de pagamento",
    });
  }
};