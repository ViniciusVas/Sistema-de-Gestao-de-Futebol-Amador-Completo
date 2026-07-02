import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CircleDot,
  Clock3,
  Loader2,
  Radio,
  Timer,
  Trophy,
  Users,
} from "lucide-react";
import api from "../services/api";
import socket from "../services/socket";

interface Jogador {
  id: number;
  nome: string;
  nivel_estrelas?: number;
}

interface TimeJogador {
  id: number;
  jogador_id: number;
  jogador: Jogador;
}

interface Time {
  id: number;
  nome_time: string;
  ordem: number;
  em_jogo: boolean;
  gols: number;
  jogadores: TimeJogador[];
}

interface Evento {
  id: number;
  tipo: "gol" | "cartao_amarelo" | "cartao_vermelho";
  minuto: number;
  time_id: number;
  jogador_id: number;
  jogador_nome: string;
  jogador_assistencia_id?: number | null;
  assistencia_nome?: string | null;
}

const PeladaAcompanhamento = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [peladaIdInput, setPeladaIdInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [times, setTimes] = useState<Time[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const formatTime = (totalSeconds: number) => {
    const safeSeconds = Math.max(0, totalSeconds || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const sortTimes = (items: Time[]) => {
    return [...items].sort((a, b) => {
      const firstOrder = a.ordem || a.id;
      const secondOrder = b.ordem || b.id;

      return firstOrder - secondOrder;
    });
  };

  const normalizeTime = (time: any): Time => {
    return {
      id: Number(time.id),
      nome_time: time.nome_time || `Time ${time.ordem || ""}`,
      ordem: Number(time.ordem || 0),
      em_jogo: Boolean(time.em_jogo),
      gols: Number(time.gols || 0),
      jogadores: (time.jogadores || []).map((item: any) => ({
        id: Number(item.id),
        jogador_id: Number(item.jogador_id),
        jogador: {
          id: Number(item.jogador?.id || item.jogador_id),
          nome: item.jogador?.nome || "Jogador",
          nivel_estrelas: Number(item.jogador?.nivel_estrelas || 0),
        },
      })),
    };
  };

  const normalizeEvento = (evento: any): Evento => {
    return {
      id: Number(evento.id),
      tipo: evento.tipo,
      minuto: Number(evento.minuto || 0),
      time_id: Number(evento.time_id),
      jogador_id: Number(evento.jogador_id),
      jogador_nome: evento.jogador?.nome || "Jogador",
      jogador_assistencia_id:
        evento.jogador_assistencia_id !== null &&
        evento.jogador_assistencia_id !== undefined
          ? Number(evento.jogador_assistencia_id)
          : null,
      assistencia_nome: evento.jogadorAssistencia?.nome || null,
    };
  };

  const fetchData = async (showLoading = true) => {
    if (!id) {
      return;
    }

    try {
      if (showLoading) {
        setLoading(true);
      }

      setError("");

      const [timesResponse, eventosResponse] = await Promise.all([
        api.get(`/peladas/${id}/times`),
        api.get(`/peladas/${id}/eventos`),
      ]);

      const normalizedTimes = sortTimes(
        (timesResponse.data || []).map((time: any) => normalizeTime(time))
      );

      const normalizedEventos = (eventosResponse.data || []).map(
        (evento: any) => normalizeEvento(evento)
      );

      setTimes(normalizedTimes);
      setEventos(normalizedEventos);
    } catch (requestError: any) {
      console.error("Erro ao carregar acompanhamento:", requestError);

      setError(
        requestError?.response?.data?.erro ||
          requestError?.response?.data?.error ||
          "Não foi possível carregar os dados desta partida."
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    fetchData();
  }, [id]);

  useEffect(() => {
    if (!id) {
      return;
    }

    const peladaId = Number(id);

    if (!Number.isFinite(peladaId)) {
      return;
    }

    socket.emit("entrar-pelada", peladaId);

    const isCurrentPelada = (data: any) => {
      const receivedPeladaId = Number(
        data?.peladaId ?? data?.pelada_id
      );

      return receivedPeladaId === peladaId;
    };

    const handleCronometroIniciar = (data: any) => {
      if (!isCurrentPelada(data)) {
        return;
      }

      setIsActive(true);
      setSeconds(Number(data.tempo_restante ?? data.tempoRestante ?? 0));
    };

    const handleCronometroAtualizar = (data: any) => {
      if (!isCurrentPelada(data)) {
        return;
      }

      setIsActive(true);
      setSeconds(Number(data.tempo_restante ?? data.tempoRestante ?? 0));
    };

    const handleCronometroPausar = (data: any) => {
      if (!isCurrentPelada(data)) {
        return;
      }

      setIsActive(false);
    };

    const handleCronometroReiniciar = (data: any) => {
      if (!isCurrentPelada(data)) {
        return;
      }

      setIsActive(false);
      setSeconds(Number(data.tempo_restante ?? data.tempoRestante ?? 0));
    };

    const handleCronometroFinalizado = (data: any) => {
      if (!isCurrentPelada(data)) {
        return;
      }

      setIsActive(false);
      setSeconds(0);
    };

    const handlePlacarAtualizar = (data: any) => {
      if (!isCurrentPelada(data)) {
        return;
      }

      setTimes((currentTimes) => {
        const sortedTimes = sortTimes(currentTimes);

        const activeTimes = sortedTimes.filter((time) => time.em_jogo);

        const matchTimes =
          activeTimes.length > 0
            ? activeTimes.slice(0, 2)
            : sortedTimes.slice(0, 2);

        if (matchTimes.length < 2) {
          return currentTimes;
        }

        return currentTimes.map((time) => {
          if (time.id === matchTimes[0].id) {
            return {
              ...time,
              gols: Number(data.placar_time1 || 0),
            };
          }

          if (time.id === matchTimes[1].id) {
            return {
              ...time,
              gols: Number(data.placar_time2 || 0),
            };
          }

          return time;
        });
      });
    };

    const handleEventoNovo = (data: any) => {
      if (!isCurrentPelada(data)) {
        return;
      }

      fetchData(false);
    };

    const handlePartidaEncerradaERodada = (data: any) => {
      if (!isCurrentPelada(data)) {
        return;
      }

      setIsActive(false);
      setSeconds(Number(data.tempo_restante ?? data.tempoRestante ?? 0));

      fetchData(false);
    };

    socket.on("cronometro:iniciar", handleCronometroIniciar);
    socket.on("cronometro:atualizar", handleCronometroAtualizar);
    socket.on("cronometro:pausar", handleCronometroPausar);
    socket.on("cronometro:reiniciar", handleCronometroReiniciar);
    socket.on("cronometro:finalizado", handleCronometroFinalizado);
    socket.on("placar:atualizar", handlePlacarAtualizar);
    socket.on("evento:novo", handleEventoNovo);
    socket.on("partida:encerrada-e-rodada", handlePartidaEncerradaERodada);

    return () => {
      socket.off("cronometro:iniciar", handleCronometroIniciar);
      socket.off("cronometro:atualizar", handleCronometroAtualizar);
      socket.off("cronometro:pausar", handleCronometroPausar);
      socket.off("cronometro:reiniciar", handleCronometroReiniciar);
      socket.off("cronometro:finalizado", handleCronometroFinalizado);
      socket.off("placar:atualizar", handlePlacarAtualizar);
      socket.off("evento:novo", handleEventoNovo);
      socket.off(
        "partida:encerrada-e-rodada",
        handlePartidaEncerradaERodada
      );
    };
  }, [id]);

  const handleOpenPelada = (e: React.FormEvent) => {
    e.preventDefault();

    const peladaId = Number(peladaIdInput);

    if (!Number.isInteger(peladaId) || peladaId <= 0) {
      return;
    }

    navigate(`/acompanhamento/${peladaId}`);
  };

  const getEventInfo = (tipo: Evento["tipo"]) => {
    switch (tipo) {
      case "gol":
        return {
          label: "Gol",
          className: "bg-green-500/10 text-green-500 border-green-500/20",
        };

      case "cartao_amarelo":
        return {
          label: "Cartão amarelo",
          className:
            "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        };

      case "cartao_vermelho":
        return {
          label: "Cartão vermelho",
          className: "bg-red-500/10 text-red-500 border-red-500/20",
        };

      default:
        return {
          label: "Evento",
          className: "bg-zinc-500/10 text-app-text-muted border-app-border",
        };
    }
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-app-bg text-app-text">
        <header className="border-b border-app-border bg-app-sidebar">
          <div className="max-w-xl mx-auto px-4 py-5">
            <Link
              to="/"
              className="text-2xl font-bold text-blue-500 font-display tracking-tight"
            >
              FutGestão
            </Link>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-4 py-16">
          <div className="bg-app-card border border-app-border rounded-3xl p-8 md:p-10 text-center shadow-lg">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-6">
              <Radio className="w-8 h-8 animate-pulse" />
            </div>

            <h1 className="text-2xl font-bold mb-3">
              Acompanhar Pelada ao Vivo
            </h1>

            <p className="text-app-text-muted mb-8">
              Informe o ID da pelada para ver placar, cronômetro, escalações e
              eventos em tempo real.
            </p>

            <form onSubmit={handleOpenPelada} className="space-y-4">
              <div className="text-left">
                <label className="block text-sm font-medium text-app-text-muted mb-2">
                  ID da pelada
                </label>

                <input
                  type="number"
                  min="1"
                  required
                  value={peladaIdInput}
                  onChange={(e) => setPeladaIdInput(e.target.value)}
                  placeholder="Ex.: 14"
                  className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition"
              >
                Abrir acompanhamento
              </button>
            </form>

            <p className="mt-6 text-xs text-app-text-muted">
              Link direto: <strong>/acompanhamento/ID_DA_PELADA</strong>
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center gap-4 text-app-text">
        <Loader2 className="w-9 h-9 animate-spin text-blue-500" />

        <p className="text-app-text-muted">
          Carregando acompanhamento ao vivo...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center p-4 text-app-text">
        <div className="w-full max-w-md bg-app-card border border-app-border rounded-2xl p-8 text-center">
          <Trophy className="w-12 h-12 text-app-text-muted mx-auto mb-4" />

          <h1 className="text-xl font-bold mb-2">
            Não foi possível abrir a partida
          </h1>

          <p className="text-app-text-muted">{error}</p>

          <Link
            to="/acompanhamento"
            className="inline-flex mt-6 px-5 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
          >
            Informar outro ID
          </Link>
        </div>
      </div>
    );
  }

  const sortedTimes = sortTimes(times);

  const activeTimes = sortedTimes.filter((time) => time.em_jogo);

  const matchTimes =
    activeTimes.length > 0
      ? activeTimes.slice(0, 2)
      : sortedTimes.slice(0, 2);

  const waitingTimes = sortedTimes.filter(
    (time) => !matchTimes.some((matchTime) => matchTime.id === time.id)
  );

  const homeTeam = matchTimes[0];
  const awayTeam = matchTimes[1];

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <header className="border-b border-app-border bg-app-sidebar">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <Link
            to="/acompanhamento"
            className="text-2xl font-bold text-blue-500 font-display tracking-tight"
          >
            FutGestão
          </Link>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-500">
            <Radio className="w-4 h-4 animate-pulse" />
            Ao vivo
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <section className="bg-app-card rounded-3xl border border-app-border overflow-hidden shadow-lg">
          <div className="bg-zinc-950 text-white px-6 py-10 md:px-10 md:py-14 text-center relative overflow-hidden">
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-red-500/20 blur-3xl" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 mb-5">
                <Timer
                  className={`w-5 h-5 ${
                    isActive
                      ? "text-green-400 animate-pulse"
                      : "text-zinc-400"
                  }`}
                />

                <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
                  Tempo restante
                </span>
              </div>

              <div className="text-7xl md:text-9xl font-black font-mono tracking-tighter">
                {formatTime(seconds)}
              </div>

              <div className="mt-5 flex items-center justify-center gap-2 text-sm text-zinc-400">
                <Clock3 className="w-4 h-4" />

                {isActive
                  ? "Cronômetro em andamento"
                  : "Cronômetro pausado"}
              </div>
            </div>
          </div>

          <div className="p-6 md:p-10">
            {homeTeam && awayTeam ? (
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-6 text-center">
                <div>
                  <h1 className="text-xl md:text-2xl font-black">
                    {homeTeam.nome_time}
                  </h1>

                  <p className="text-7xl md:text-8xl font-black font-mono text-blue-500 mt-3">
                    {homeTeam.gols}
                  </p>

                  <p className="text-sm text-app-text-muted mt-3">
                    {homeTeam.jogadores.length} jogador(es)
                  </p>
                </div>

                <div className="text-3xl font-black text-app-text-muted">
                  X
                </div>

                <div>
                  <h1 className="text-xl md:text-2xl font-black">
                    {awayTeam.nome_time}
                  </h1>

                  <p className="text-7xl md:text-8xl font-black font-mono text-red-500 mt-3">
                    {awayTeam.gols}
                  </p>

                  <p className="text-sm text-app-text-muted mt-3">
                    {awayTeam.jogadores.length} jogador(es)
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="font-bold">
                  Os times ainda não foram definidos.
                </p>

                <p className="text-sm text-app-text-muted mt-2">
                  Assim que o organizador realizar o sorteio, os times aparecerão
                  aqui.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-app-card border border-app-border rounded-2xl p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-5">
              <Users className="w-5 h-5 text-blue-500" />
              Times em campo
            </h2>

            <div className="space-y-4">
              {matchTimes.length > 0 ? (
                matchTimes.map((time) => (
                  <div
                    key={time.id}
                    className="rounded-xl bg-app-bg border border-app-border p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold">{time.nome_time}</h3>

                      <span className="text-xs text-app-text-muted">
                        Time {time.ordem}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {time.jogadores.map((item) => (
                        <span
                          key={item.id}
                          className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500"
                        >
                          {item.jogador.nome}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-app-text-muted">
                  Nenhum time em campo no momento.
                </p>
              )}
            </div>
          </div>

          <div className="bg-app-card border border-app-border rounded-2xl p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-5">
              <CircleDot className="w-5 h-5 text-green-500" />
              Eventos da partida
            </h2>

            <div className="space-y-3 max-h-[370px] overflow-y-auto pr-1">
              {eventos.length > 0 ? (
                eventos.map((evento) => {
                  const event = getEventInfo(evento.tipo);

                  return (
                    <div
                      key={evento.id}
                      className="rounded-xl bg-app-bg border border-app-border p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider font-black ${event.className}`}
                        >
                          {event.label}
                        </span>

                        <span className="text-xs text-app-text-muted">
                          {evento.minuto}'
                        </span>
                      </div>

                      <p className="font-semibold">{evento.jogador_nome}</p>

                      {evento.assistencia_nome && (
                        <p className="text-xs text-app-text-muted mt-1">
                          Assistência: {evento.assistencia_nome}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-app-text-muted text-center py-10">
                  Ainda não há eventos registrados nesta partida.
                </p>
              )}
            </div>
          </div>
        </section>

        {waitingTimes.length > 0 && (
  <section className="bg-app-card border border-app-border rounded-2xl p-6">
    <h2 className="flex items-center gap-2 text-lg font-bold mb-5">
      <Trophy className="w-5 h-5 text-yellow-500" />
      Próximos times
    </h2>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {waitingTimes.map((time) => (
        <div
          key={time.id}
          className="rounded-xl bg-app-bg border border-app-border p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-sm">{time.nome_time}</p>

            <span className="text-xs text-app-text-muted">
              {time.jogadores.length} jogador(es)
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {time.jogadores.length > 0 ? (
              time.jogadores.map((item) => (
                <span
                  key={item.id}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                >
                  {item.jogador.nome}
                </span>
              ))
            ) : (
              <p className="text-xs text-app-text-muted">
                Nenhum jogador neste time.
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  </section>
)}
      </main>
    </div>
  );
};

export default PeladaAcompanhamento;