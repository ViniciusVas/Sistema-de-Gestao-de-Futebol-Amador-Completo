import { prisma } from "../config/prisma.js";

export async function criarJogador(req, res) {
  try {
    const { nome, nivel_estrelas } = req.body;

    const jogador = await prisma.jogador.create({
      data: {
        nome,
        nivel_estrelas,
        organizadorId: req.user.id
      }
    });

    res.status(201).json(jogador);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
}

export async function listarJogadores(req, res) {
  try {
    const jogadores = await prisma.jogador.findMany({
      where: {
        organizadorId: req.user.id
      }
    });

    res.json(jogadores);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
}

export async function editarJogador(req, res) {
  try {
    const { id } = req.params;
    const { nome, nivel_estrelas, ativo } = req.body;

    const jogador = await prisma.jogador.update({
      where: { id: Number(id) },
      data: { nome, nivel_estrelas, ativo }
    });

    res.json(jogador);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
}

export async function deletarJogador(req, res) {
  try {
    const { id } = req.params;

    await prisma.jogador.update({
      where: { id: Number(id) },
      data: { ativo: false }
    });

    res.json({ mensagem: "Jogador desativado" });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
}