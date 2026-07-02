import {
  processarEstatisticasPelada,
  buscarEstatisticasJogador
} from "../services/estatisticaService.js";

export const finalizarPelada = async (req, res) => {

  try {

    const { id } = req.params;

    await processarEstatisticasPelada(id);

    return res.status(200).json({
      message: "Pelada finalizada e estatísticas atualizadas"
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
};

export const getEstatisticasJogador = async (req, res) => {

  try {

    const { id } = req.params;

    const jogador =
      await buscarEstatisticasJogador(id);

    return res.status(200).json(jogador);

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
};