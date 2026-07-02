import * as authService from "../services/authService.js";

export async function register(req, res) {
  try {
    const user = await authService.register(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
}

export async function login(req, res) {
  try {
    const data = await authService.login(req.body);
    res.json(data);
  } catch (err) {
    res.status(401).json({ erro: err.message });
  }
}

export function forgotPassword(req, res) {
  res.json({ mensagem: "Email enviado (simulado)" });
}