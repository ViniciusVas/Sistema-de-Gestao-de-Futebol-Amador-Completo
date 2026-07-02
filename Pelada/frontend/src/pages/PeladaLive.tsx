import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  UserPlus,
  Timer,
  ChevronLeft,
  Loader2,
  Trophy,
  History,
  Info,
  X,
  Users,
  Handshake,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../services/api";
import { cn } from "../lib/utils";
import socket from "../services/socket";

interface Jogador {
  id: number;
  nome: string;
  nivel_estrelas: number;
}

interface TimeJogador {
  id: number;
  jogador_id: number;
  jogador: Jogador;
}

interface Time {
  id: number;
  nome_time: string;
  soma_estrelas: number;
  ordem: number;
  em_jogo: boolean;
  gols?: number;
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

interface Pelada {
  id: number;
  titulo: string;
  data_hora?: string;
  local?: string;
  status?: string;
  duracao_minutos?: number;
  tempo_restante?: number | null;
  cronometro_ativo?: boolean;
  placar_time1?: number;
  placar_time2?: number;
  valor_por_jogador?: number;
}

const PeladaLive = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [pelada, setPelada] = useState<Pelada | null>(null);
  const [times, setTimes] = useState<Time[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);

  const [score, setScore] = useState({
    casa: 0,
    visitante: 0,
  });

  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isEndingMatch, setIsEndingMatch] = useState(false);

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);

  const [selectedSaiId, setSelectedSaiId] = useState<number | null>(null);
  const [selectedTimeId, setSelectedTimeId] = useState<number | null>(null);
  const [goalPlayerId, setGoalPlayerId] = useState<number | null>(null);
  const [cardPlayerId, setCardPlayerId] = useState<number | null>(null);

  const isOrganizador = true;

  const getErrorMessage = (error: any, fallback: string) => {
    return (
      error?.response?.data?.erro ||
      error?.response?.data?.error ||
      error?.response?.data?.mensagem ||
      fallback
    );
  };

  const formatTime = (totalSeconds: number) => {
    const safeSeconds = Math.max(0, totalSeconds || 0);
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;

    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const normalizeTime = (time: any): Time => {
    const jogadores: TimeJogador[] = (time.jogadores || []).map((item: any) => {
      const jogador = item.jogador || {};

      return {
        id: Number(item.id),
        jogador_id: Number(item.jogador_id ?? jogador.id),
        jogador: {
          id: Number(jogador.id ?? item.jogador_id),
          nome: jogador.nome || item.jogador_nome || "Jogador",
          nivel_estrelas: Number(
            jogador.nivel_estrelas ?? item.jogador_nivel ?? 0
          ),
        },
      };
    });

    const somaEstrelas = jogadores.reduce(
      (total, item) => total + Number(item.jogador.nivel_estrelas || 0),
      0
    );

    return {
      id: Number(time.id),
      nome_time: time.nome_time || `Time ${time.ordem || ""}`,
      soma_estrelas: Number(time.soma_estrelas ?? somaEstrelas),
      ordem: Number(time.ordem || 0),
      em_jogo: Boolean(time.em_jogo),
      gols: Number(time.gols || 0),
      jogadores,
    };
  };

  const normalizeEvento = (evento: any): Evento => {
    return {
      id: Number(evento.id),
      tipo: evento.tipo,
      minuto: Number(evento.minuto || 0),
      time_id: Number(evento.time_id),
      jogador_id: Number(evento.jogador_id),
      jogador_nome: evento.jogador_nome || evento.jogador?.nome || "Jogador",
      jogador_assistencia_id:
        evento.jogador_assistencia_id !== undefined &&
        evento.jogador_assistencia_id !== null
          ? Number(evento.jogador_assistencia_id)
          : null,
      assistencia_nome:
        evento.assistencia_nome || evento.jogadorAssistencia?.nome || null,
    };
  };

  const sortTimes = (items: Time[]) => {
    return [...items].sort((a, b) => {
      const ordemA = a.ordem || a.id;
      const ordemB = b.ordem || b.id;

      return ordemA - ordemB;
    });
  };

  const getTeamColor = (index: number) => {
    if (index === 0) return "#ef4444";
    if (index === 1) return "#3b82f6";
    return "#3f3f46";
  };

  const fetchData = async (showLoading = true) => {
    if (!id) return;

    if (showLoading) {
      setLoading(true);
    }

    try {
      const [peladaResponse, peladasResponse, timesResponse, eventosResponse] =
        await Promise.all([
          api.get(`/peladas/${id}`),
          api.get("/peladas"),
          api.get(`/peladas/${id}/times`),
          api.get(`/peladas/${id}/eventos`),
        ]);

      const peladaDaLista = Array.isArray(peladasResponse.data)
        ? peladasResponse.data.find(
            (item: Pelada) => Number(item.id) === Number(id)
          )
        : null;

      const peladaData: Pelada = {
        ...(peladaDaLista || {}),
        ...peladaResponse.data,
      };

      const normalizedTimes = sortTimes(
        (timesResponse.data || []).map((time: any) => normalizeTime(time))
      );

      const normalizedEventos = (eventosResponse.data || []).map((evento: any) =>
        normalizeEvento(evento)
      );

      const tempoInicial =
        peladaData.tempo_restante ??
        Number(peladaData.duracao_minutos || 0) * 60;

      setPelada(peladaData);
      setTimes(normalizedTimes);
      setEventos(normalizedEventos);
      setScore({
        casa: Number(peladaData.placar_time1 || 0),
        visitante: Number(peladaData.placar_time2 || 0),
      });
      setSeconds(Number(tempoInicial || 0));
      setIsActive(Boolean(peladaData.cronometro_ativo));
    } catch (error) {
      console.error("Erro ao carregar jogo ao vivo:", error);
      toast.error(getErrorMessage(error, "Erro ao carregar jogo ao vivo."));
      setPelada(null);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const peladaId = Number(id);

    socket.emit("entrar-pelada", peladaId);

    const isCurrentPelada = (data: any) => {
      const incomingId = Number(data?.peladaId ?? data?.pelada_id ?? peladaId);
      return incomingId === peladaId;
    };

    const handleCronometroIniciar = (data: any) => {
      if (!isCurrentPelada(data)) return;

      setIsActive(true);
      setSeconds(Number(data.tempo_restante ?? data.tempoRestante ?? 0));
    };

    const handleCronometroAtualizar = (data: any) => {
      if (!isCurrentPelada(data)) return;

      setIsActive(true);
      setSeconds(Number(data.tempo_restante ?? data.tempoRestante ?? 0));
    };

    const handleCronometroPausar = (data: any) => {
      if (!isCurrentPelada(data)) return;

      setIsActive(false);
    };

    const handleCronometroReiniciar = (data: any) => {
      if (!isCurrentPelada(data)) return;

      setIsActive(false);
      setSeconds(Number(data.tempo_restante ?? data.tempoRestante ?? 0));
    };

    const handleCronometroFinalizado = (data: any) => {
      if (!isCurrentPelada(data)) return;

      setIsActive(false);
      setSeconds(0);
      toast("Tempo finalizado!");
    };

    const handlePlacarAtualizar = (data: any) => {
      if (!isCurrentPelada(data)) return;

      setScore({
        casa: Number(data.placar_time1 || 0),
        visitante: Number(data.placar_time2 || 0),
      });
    };

    const handlePartidaEncerradaERodada = (data: any) => {
      if (!isCurrentPelada(data)) return;

      setScore({
        casa: Number(data.placar_time1 || 0),
        visitante: Number(data.placar_time2 || 0),
      });

      setEventos([]);
      setIsActive(false);
      setSeconds(Number(data.tempo_restante ?? data.tempoRestante ?? 0));

      if (Array.isArray(data.times)) {
        setTimes(
          sortTimes(
            data.times.map((time: any) => normalizeTime(time))
          )
        );
      }

      if (data.pelada) {
        setPelada((currentPelada) => ({
          ...(currentPelada || {}),
          ...data.pelada,
        }));
      }

      setShowGoalModal(false);
      setShowCardModal(false);
      setShowSubModal(false);
      setShowSummaryModal(false);
      setSelectedSaiId(null);
      setSelectedTimeId(null);
      setGoalPlayerId(null);
      setCardPlayerId(null);
    };

    const handleEventoNovo = async (evento: any) => {
      if (
        evento?.pelada_id !== undefined &&
        Number(evento.pelada_id) !== peladaId
      ) {
        return;
      }

      const eventoNormalizado = normalizeEvento(evento);

      setEventos((prev) => {
        const alreadyExists = prev.some(
          (item) => item.id === eventoNormalizado.id
        );

        if (alreadyExists) {
          return prev;
        }

        return [eventoNormalizado, ...prev];
      });

      await fetchData(false);
    };

    socket.on("cronometro:iniciar", handleCronometroIniciar);
    socket.on("cronometro:atualizar", handleCronometroAtualizar);
    socket.on("cronometro:pausar", handleCronometroPausar);
    socket.on("cronometro:reiniciar", handleCronometroReiniciar);
    socket.on("cronometro:finalizado", handleCronometroFinalizado);
    socket.on("placar:atualizar", handlePlacarAtualizar);
    socket.on("partida:encerrada-e-rodada", handlePartidaEncerradaERodada);
    socket.on("evento:novo", handleEventoNovo);

    return () => {
      socket.off("cronometro:iniciar", handleCronometroIniciar);
      socket.off("cronometro:atualizar", handleCronometroAtualizar);
      socket.off("cronometro:pausar", handleCronometroPausar);
      socket.off("cronometro:reiniciar", handleCronometroReiniciar);
      socket.off("cronometro:finalizado", handleCronometroFinalizado);
      socket.off("placar:atualizar", handlePlacarAtualizar);
      socket.off("partida:encerrada-e-rodada", handlePartidaEncerradaERodada);
      socket.off("evento:novo", handleEventoNovo);
    };
  }, [id]);

  const iniciarCronometro = async () => {
    if (!id) return;

    try {
      await api.post(`/jogo/${id}/cronometro/iniciar`);
    } catch (error) {
      console.error("Erro ao iniciar cronômetro:", error);
      toast.error(getErrorMessage(error, "Erro ao iniciar cronômetro."));
    }
  };

  const pausarCronometro = async () => {
    if (!id) return;

    try {
      await api.post(`/jogo/${id}/cronometro/pausar`);
      setIsActive(false);
    } catch (error) {
      console.error("Erro ao pausar cronômetro:", error);
      toast.error(getErrorMessage(error, "Erro ao pausar cronômetro."));
    }
  };

  const reiniciarCronometro = async () => {
    if (!id) return;

    try {
      await api.post(`/jogo/${id}/cronometro/reiniciar`);
      await fetchData(false);
    } catch (error) {
      console.error("Erro ao reiniciar cronômetro:", error);
      toast.error(getErrorMessage(error, "Erro ao reiniciar cronômetro."));
    }
  };

  const toggleTimer = async () => {
    if (isActive) {
      await pausarCronometro();
    } else {
      await iniciarCronometro();
    }
  };

  const updateScore = async (side: "casa" | "visitante", delta: number) => {
    if (!id) return;

    const timeNumber = side === "casa" ? 1 : 2;
    const currentValue = side === "casa" ? score.casa : score.visitante;
    const newValue = Math.max(0, currentValue + delta);

    setScore((prev) => ({
      ...prev,
      [side]: newValue,
    }));

    try {
      await api.post(`/jogo/${id}/placar`, {
        time: timeNumber,
        gols: newValue,
      });
    } catch (error) {
      console.error("Erro ao atualizar placar:", error);
      toast.error(getErrorMessage(error, "Erro ao atualizar placar."));
      await fetchData(false);
    }
  };

  const handleRodarTimes = async (timeId: number) => {
    if (!id || isEndingMatch) return;

    const confirmar = window.confirm(
      "Encerrar a partida atual?\n\n" +
        "As estatísticas serão processadas, o resumo será limpo, o placar e o cronômetro serão reiniciados e o próximo time entrará em jogo."
    );

    if (!confirmar) return;

    try {
      setIsEndingMatch(true);

      await api.post(`/peladas/${id}/partida/encerrar-e-rodar`, {
        timeSaiuId: timeId,
      });

      toast.success("Partida encerrada! Novo time em jogo.");

      setShowGoalModal(false);
      setShowCardModal(false);
      setShowSubModal(false);
      setShowSummaryModal(false);
      setSelectedSaiId(null);
      setSelectedTimeId(null);
      setGoalPlayerId(null);
      setCardPlayerId(null);

      await fetchData(false);
    } catch (error) {
      console.error("Erro ao encerrar partida e rodar times:", error);

      toast.error(
        getErrorMessage(
          error,
          "Erro ao encerrar partida e colocar o próximo time em jogo."
        )
      );

      await fetchData(false);
    } finally {
      setIsEndingMatch(false);
    }
  };

  const handleSubstituir = async (saiId: number, entraId: number) => {
    if (!id || !selectedTimeId) return;

    try {
      await api.post(`/peladas/${id}/substituir`, {
        jogadorSaiId: saiId,
        jogadorEntraId: entraId,
        timeId: selectedTimeId,
      });

      toast.success("Substituição realizada!");
      setShowSubModal(false);
      setSelectedSaiId(null);
      setSelectedTimeId(null);
      await fetchData(false);
    } catch (error) {
      console.error("Erro ao substituir jogador:", error);
      toast.error(getErrorMessage(error, "Erro ao substituir jogador."));
    }
  };

  const handleRegisterEvent = async (
    tipo: "gol" | "cartao_amarelo" | "cartao_vermelho",
    timeId: number,
    jogadorId: number,
    assistenciaId?: number
  ) => {
    if (!id) return;

    const jogadorNome =
      times
        .flatMap((time) => time.jogadores)
        .find((item) => item.jogador.id === jogadorId)?.jogador.nome ||
      "Jogador";

    if (
      tipo.includes("cartao") &&
      !window.confirm(
        `Confirmar ${tipo.replace("_", " ")} para ${jogadorNome}?`
      )
    ) {
      return;
    }

    try {
      await api.post(`/peladas/${id}/eventos`, {
        tipo,
        time_id: timeId,
        jogador_id: jogadorId,
        jogador_assistencia_id: assistenciaId || null,
      });

      toast.success("Evento registrado!");

      setShowGoalModal(false);
      setShowCardModal(false);
      setGoalPlayerId(null);
      setCardPlayerId(null);

      await fetchData(false);
    } catch (error) {
      console.error("Erro ao registrar evento:", error);
      toast.error(getErrorMessage(error, "Erro ao registrar evento."));
    }
  };

  const handleFinalizarPartida = async () => {
    if (!id) return;

    if (
      !window.confirm(
        "Finalizar partida? As estatísticas serão processadas pelo backend."
      )
    ) {
      return;
    }

    try {
      await api.post(`/peladas/${id}/finalizar`);

      toast.success("Pelada finalizada com sucesso!");
      navigate(`/peladas/${id}`);
    } catch (error) {
      console.error("Erro ao finalizar partida:", error);
      toast.error(getErrorMessage(error, "Erro ao finalizar partida."));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <Loader2 className="animate-spin text-green-600 h-8 w-8" />
        <p className="text-app-text-muted italic">
          Carregando jogo ao vivo...
        </p>
      </div>
    );
  }

  if (!pelada) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="text-app-text-muted text-lg italic uppercase tracking-widest font-black text-center">
          Partida não encontrada
          <br />
          <span className="text-[10px] opacity-40 block mt-2 font-mono">
            ID: {id}
          </span>
          <span className="text-[10px] opacity-40 block font-mono">
            API: {import.meta.env.VITE_API_URL || "/api"}
          </span>
        </div>

        <button
          onClick={() => navigate("/peladas")}
          className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition"
        >
          Voltar para Peladas
        </button>
      </div>
    );
  }

  const sortedTimes = sortTimes(times);
  const activeTimes = sortedTimes.filter((time) => time.em_jogo);
  const matchTimes =
    activeTimes.length > 0 ? activeTimes.slice(0, 2) : sortedTimes.slice(0, 2);

  const nextTimes = sortedTimes.filter(
    (time) => !matchTimes.some((active) => active.id === time.id)
  );

  const selectedTeam = times.find((time) => time.id === selectedTimeId);
  const selectedTeamPlayers = selectedTeam?.jogadores || [];

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto px-4 md:px-0">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/peladas/${id}`)}
          className="bg-app-card p-2 rounded-xl text-app-text-muted flex items-center hover:text-green-500 transition font-bold border border-app-border shadow-sm"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Voltar
        </button>

        <div className="flex items-center gap-3">
          <div className="bg-red-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black animate-pulse tracking-widest flex items-center shadow-[0_0_15px_rgba(239,68,68,0.4)]">
            <div className="w-1.5 h-1.5 bg-white rounded-full mr-2 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            AO VIVO
          </div>

          <div className="bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-zinc-700">
            ID: {id?.slice(-6)}
          </div>
        </div>
      </div>

      <div className="bg-app-card rounded-[2.5rem] border border-app-border overflow-hidden shadow-2xl">
        <div className="bg-zinc-950 text-white p-8 md:p-12 relative overflow-hidden">
          <div
            className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[100px] -mr-48 -mt-48 opacity-20"
            style={{ backgroundColor: getTeamColor(0) }}
          />
          <div
            className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-[100px] -ml-48 -mb-48 opacity-20"
            style={{ backgroundColor: getTeamColor(1) }}
          />

          <div className="text-center mb-10 relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl mb-4">
              <Timer
                className={cn(
                  "w-5 h-5 text-green-500",
                  isActive && "animate-pulse"
                )}
              />
              <span className="text-sm font-black text-zinc-400 uppercase tracking-[0.2em] font-mono">
                Tempo Restante
              </span>
            </div>

            <div className="text-8xl md:text-9xl font-black font-mono tracking-tighter mb-8 text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              {formatTime(seconds)}
            </div>

            {isOrganizador && (
              <div className="flex justify-center gap-4">
                <button
                  onClick={toggleTimer}
                  className={cn(
                    "px-10 py-4 rounded-2xl transition-all shadow-xl font-black uppercase tracking-widest text-sm flex items-center gap-3 transform active:scale-95",
                    isActive
                      ? "bg-orange-500 hover:bg-orange-600 shadow-orange-900/40 text-white"
                      : "bg-green-600 hover:bg-green-700 shadow-green-900/40 text-white"
                  )}
                >
                  {isActive ? (
                    <>
                      <Pause className="w-5 h-5 fill-current" />
                      Pausar
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      Começar
                    </>
                  )}
                </button>

                <button
                  onClick={reiniciarCronometro}
                  className="p-4 bg-zinc-800 rounded-2xl hover:bg-zinc-700 transition-all border border-zinc-700 active:scale-95"
                  title="Reiniciar Cronômetro"
                >
                  <RotateCcw className="text-white w-5 h-5" />
                </button>

                <button
                  onClick={() => setShowSummaryModal(true)}
                  className="px-6 py-4 bg-zinc-100 dark:bg-zinc-900 rounded-2xl hover:bg-white dark:hover:bg-zinc-800 transition-all border border-zinc-700 shadow-xl font-black text-[10px] uppercase tracking-[0.2em] text-app-text active:scale-95"
                >
                  ENCERRAR
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-around gap-8 md:gap-4 text-center relative z-10 max-w-4xl mx-auto">
            {matchTimes.map((time, index) => (
              <React.Fragment key={time.id}>
                <div className="flex-1 w-full md:w-auto">
                  <div className="flex flex-col items-center">
                    <div
                      className="text-[10px] font-black text-white uppercase tracking-widest mb-4 px-4 py-1.5 rounded-full border shadow-lg"
                      style={{
                        backgroundColor: getTeamColor(index),
                        borderColor: "rgba(255,255,255,0.2)",
                      }}
                    >
                      {time.nome_time || `Time ${index + 1}`}
                    </div>

                    <div className="text-9xl font-black font-mono text-white tracking-tighter leading-none select-none drop-shadow-2xl">
                      {index === 0 ? score.casa : score.visitante}
                    </div>

                    {isOrganizador && (
                      <div className="flex flex-col items-center gap-3 mt-8">
                        <div className="flex justify-center gap-3">
                          <button
                            onClick={() => {
                              setSelectedTimeId(time.id);
                              setGoalPlayerId(null);
                              setShowGoalModal(true);
                            }}
                            className="bg-green-600 px-6 py-3 rounded-2xl hover:bg-green-700 transition-all text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-green-900/40 active:scale-95"
                          >
                            GOL
                          </button>

                          <button
                            onClick={() => {
                              setSelectedTimeId(time.id);
                              setCardPlayerId(null);
                              setShowCardModal(true);
                            }}
                            className="bg-yellow-500 px-6 py-3 rounded-2xl hover:bg-yellow-600 transition-all text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-yellow-900/40 active:scale-95"
                          >
                            CARTÃO
                          </button>
                        </div>

                        <div className="flex justify-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                          <button
                            onClick={() =>
                              updateScore(
                                index === 0 ? "casa" : "visitante",
                                1
                              )
                            }
                            className="bg-zinc-800 w-8 h-8 rounded-lg hover:bg-zinc-700 transition-all text-white font-black text-xs shadow-xl border border-zinc-700 active:scale-90"
                          >
                            +
                          </button>

                          <button
                            onClick={() =>
                              updateScore(
                                index === 0 ? "casa" : "visitante",
                                -1
                              )
                            }
                            className="bg-zinc-800 w-8 h-8 rounded-lg hover:bg-zinc-700 transition-all text-white font-black text-xs shadow-xl border border-zinc-700 active:scale-90"
                          >
                            -
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {index === 0 && (
                  <div className="text-4xl md:text-5xl font-black text-zinc-900 border-y border-zinc-900/50 py-2 italic transform -rotate-12 select-none hidden md:block">
                    VS
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {matchTimes.length === 0 && (
            <div className="text-center text-zinc-500 font-black uppercase tracking-widest">
              Nenhum time confirmado em jogo.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-app-border bg-app-bg/5">
          {matchTimes.map((time, teamIndex) => (
            <div key={time.id} className="p-8 space-y-6">
              <div className="flex justify-between items-center border-b border-app-border pb-6">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.2)]"
                    style={{ backgroundColor: getTeamColor(teamIndex) }}
                  />

                  <h3 className="font-extrabold text-app-text uppercase tracking-tighter text-base">
                    {time.nome_time}
                  </h3>
                </div>

                {isOrganizador && (
                  <button
                    onClick={() => handleRodarTimes(time.id)}
                    disabled={isEndingMatch}
                    className="text-[10px] bg-red-500/10 text-red-500 px-4 py-2.5 rounded-xl font-black hover:bg-red-600 hover:text-white transition-all uppercase tracking-widest border border-red-500/30 shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center gap-2"
                  >
                    {isEndingMatch ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ENCERRANDO...
                      </>
                    ) : (
                      "TIME TERMINOU (SAI)"
                    )}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2">
                {[...time.jogadores]
                  .sort((a, b) =>
                    (a.jogador.nome || "").localeCompare(b.jogador.nome || "")
                  )
                  .map((timeJogador) => {
                    const jogador = timeJogador.jogador;

                    return (
                      <div
                        key={timeJogador.id || jogador.id}
                        className="flex justify-between items-center p-4 hover:bg-white dark:hover:bg-zinc-900 rounded-2xl group transition-all border border-transparent hover:border-app-border hover:shadow-md"
                      >
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-xl bg-app-bg border border-app-border flex items-center justify-center text-app-text font-black text-xs mr-4 shadow-inner group-hover:scale-110 transition-transform relative">
                            {jogador.nome.charAt(0)}

                            <div className="absolute -top-1 -right-1 flex gap-0.5">
                              {eventos.some(
                                (event) =>
                                  event.jogador_id === jogador.id &&
                                  event.tipo === "cartao_amarelo"
                              ) && (
                                <div className="w-2 h-3 bg-yellow-400 rounded-sm shadow-sm border border-yellow-500" />
                              )}

                              {eventos.some(
                                (event) =>
                                  event.jogador_id === jogador.id &&
                                  event.tipo === "cartao_vermelho"
                              ) && (
                                <div className="w-2 h-3 bg-red-500 rounded-sm shadow-sm border border-red-600" />
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col">
                            <div
                              onClick={() => navigate(`/players/${jogador.id}`)}
                              className="font-black text-app-text-muted group-hover:text-app-text transition-colors uppercase tracking-tight text-sm flex items-center gap-2 cursor-pointer hover:underline"
                            >
                              {jogador.nome}

                              {eventos.filter(
                                (event) =>
                                  event.jogador_id === jogador.id &&
                                  event.tipo === "gol"
                              ).length > 0 && (
                                <span className="text-[10px] flex items-center gap-0.5 text-green-500">
                                  ⚽
                                  <span className="font-black">
                                    {
                                      eventos.filter(
                                        (event) =>
                                          event.jogador_id === jogador.id &&
                                          event.tipo === "gol"
                                      ).length
                                    }
                                  </span>
                                </span>
                              )}
                            </div>

                            <div className="text-[9px] text-app-text-muted/60 font-mono tracking-widest">
                              NÍVEL{" "}
                              {Number(jogador.nivel_estrelas || 0).toFixed(1)}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-1.5 md:opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0 translate-x-2">
                          {isOrganizador && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedTimeId(time.id);
                                  setGoalPlayerId(jogador.id);
                                  setShowGoalModal(true);
                                }}
                                className="p-2.5 bg-green-500/10 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm border border-green-500/20"
                                title="Registrar Gol"
                              >
                                <Trophy className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedTimeId(time.id);
                                  setCardPlayerId(jogador.id);
                                  setShowCardModal(true);
                                }}
                                className="p-2.5 bg-yellow-500/10 text-yellow-600 rounded-xl hover:bg-yellow-500 hover:text-white transition-all shadow-sm border border-yellow-500/20"
                                title="Registrar Cartão"
                              >
                                <div className="w-3 h-4 bg-yellow-400 rounded-sm" />
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedTimeId(time.id);
                                  setSelectedSaiId(jogador.id);
                                  setShowSubModal(true);
                                }}
                                className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-500/20"
                                title="Substituir"
                              >
                                <Users className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {time.jogadores.length === 0 && (
                  <div className="text-center py-6 text-app-text-muted text-xs italic font-mono border border-dashed border-app-border rounded-2xl">
                    Este time está sem jogadores.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
        <div className="md:col-span-1 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-black text-app-text flex items-center uppercase tracking-tighter">
              <Users className="w-6 h-6 mr-3 text-green-500" />
              PRÓXIMAS
            </h2>

            <span className="text-[10px] font-black bg-zinc-100 dark:bg-zinc-800 text-app-text-muted px-3 py-1 rounded-full border border-app-border">
              {nextTimes.length} TIMES
            </span>
          </div>

          <div className="space-y-4">
            {nextTimes.map((time, index) => (
              <div
                key={time.id}
                className="bg-app-card p-6 rounded-[2rem] border border-app-border shadow-lg relative overflow-hidden group hover:border-green-500/40 transition-all"
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex flex-col">
                    <span className="font-black text-app-text text-base group-hover:text-green-500 transition-colors uppercase tracking-tight">
                      {time.nome_time}
                    </span>

                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                      {index + 1}º NA FILA
                    </span>
                  </div>

                  <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-xl border border-app-border">
                    <History className="w-4 h-4 text-zinc-400" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 border-t border-app-border/40 pt-4">
                  {[...time.jogadores]
                    .sort((a, b) =>
                      (a.jogador.nome || "").localeCompare(
                        b.jogador.nome || ""
                      )
                    )
                    .map((timeJogador) => (
                      <div
                        key={timeJogador.id || timeJogador.jogador.id}
                        className="text-xs text-app-text-muted flex justify-between font-bold"
                      >
                        <span
                          onClick={() =>
                            navigate(`/players/${timeJogador.jogador.id}`)
                          }
                          className="group-hover:text-app-text transition-colors cursor-pointer hover:underline"
                        >
                          {timeJogador.jogador.nome}
                        </span>

                        <span className="text-zinc-400 dark:text-zinc-600 font-mono text-[9px] uppercase">
                          #{timeJogador.jogador.id}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}

            {nextTimes.length === 0 && (
              <div className="text-center py-12 px-6 text-app-text-muted text-sm italic font-serif bg-app-card rounded-[2rem] border border-app-border border-dashed opacity-60">
                Nenhum time na fila de espera.
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <h2 className="text-lg font-black text-app-text flex items-center uppercase tracking-tighter px-2">
            <History className="w-6 h-6 mr-3 text-blue-500" />
            RESUMO DA PARTIDA
          </h2>

          <div className="bg-app-card rounded-[2.5rem] border border-app-border shadow-xl min-h-[400px] overflow-hidden">
            <div className="divide-y divide-app-border/40">
              {eventos.map((event) => (
                <div
                  key={event.id}
                  className="p-6 flex items-center gap-6 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-all transform hover:scale-[1.01]"
                >
                  <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-2xl text-[10px] font-black text-app-text-muted font-mono w-14 text-center uppercase tracking-tighter shadow-inner border border-app-border">
                    {event.minuto}'
                  </div>

                  <div className="flex-1">
                    <div className="text-sm font-bold text-app-text-muted flex flex-wrap items-center gap-3">
                      <span
                        onClick={() => navigate(`/players/${event.jogador_id}`)}
                        className="text-app-text hover:text-green-500 underline decoration-2 decoration-transparent hover:decoration-green-500 transition-all cursor-pointer"
                      >
                        {event.jogador_nome}
                      </span>

                      <div className="h-1 w-1 rounded-full bg-app-border" />

                      <span className="bg-zinc-100 dark:bg-zinc-800 border border-app-border px-2 py-1 rounded-lg text-[10px] font-black text-app-text-muted uppercase tracking-widest">
                        Aos {event.minuto}'
                      </span>

                      <div className="h-1 w-1 rounded-full bg-app-border" />

                      <span className="font-normal text-app-text-muted/80">
                        {event.tipo === "gol" && (
                          <span className="flex items-center gap-2">
                            Gooooooooool! ⚽
                            {event.assistencia_nome && (
                              <span className="text-[10px] text-zinc-400 font-medium italic">
                                Assistência: {event.assistencia_nome}
                              </span>
                            )}
                          </span>
                        )}

                        {event.tipo === "cartao_amarelo" && (
                          <span className="flex items-center gap-2">
                            Cartão amarelo exibido 🟨
                          </span>
                        )}

                        {event.tipo === "cartao_vermelho" && (
                          <span className="flex items-center gap-2 font-black text-red-500">
                            EXPULSO! 🟥
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {eventos.length === 0 && (
                <div className="p-24 text-center text-app-text-muted italic font-serif opacity-40">
                  A partida está sendo estudada. Nenhuma incidência até agora.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-app-card rounded-2xl w-full max-w-md border border-app-border shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-app-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-app-text italic font-serif">
                Quem entra?
              </h2>

              <button
                onClick={() => setShowSubModal(false)}
                className="p-2 text-app-text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {nextTimes.map((time) => (
                <div key={time.id} className="space-y-2">
                  <div className="text-[10px] font-black text-app-text-muted uppercase tracking-widest pl-1">
                    {time.nome_time}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {[...time.jogadores]
                      .sort((a, b) =>
                        (a.jogador.nome || "").localeCompare(
                          b.jogador.nome || ""
                        )
                      )
                      .map((timeJogador) => (
                        <button
                          key={timeJogador.id || timeJogador.jogador.id}
                          onClick={() =>
                            selectedSaiId &&
                            handleSubstituir(
                              selectedSaiId,
                              timeJogador.jogador.id
                            )
                          }
                          className="flex items-center justify-between p-3 rounded-xl border border-app-border bg-app-bg hover:bg-green-500/10 hover:border-green-500/30 transition-all text-left group"
                        >
                          <span className="font-bold text-app-text-muted group-hover:text-green-500 transition-colors uppercase tracking-tight">
                            {timeJogador.jogador.nome}
                          </span>

                          <UserPlus className="w-4 h-4 text-green-500" />
                        </button>
                      ))}
                  </div>
                </div>
              ))}

              {nextTimes.length === 0 && (
                <div className="text-center py-12 text-app-text-muted italic font-serif opacity-50">
                  Lista de próximas vazia.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-app-card rounded-2xl w-full max-w-md border border-app-border shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-app-border flex items-center justify-between bg-zinc-950">
              <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                Registrar Gol
              </h2>

              <button
                onClick={() => setShowGoalModal(false)}
                className="p-2 text-zinc-400 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-app-text">
              {!goalPlayerId ? (
                <div className="space-y-4">
                  <div className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.2em] mb-2 px-2">
                    Quem marcou o gol?
                  </div>

                  <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-60 pr-2">
                    {selectedTeamPlayers
                      .sort((a, b) =>
                        (a.jogador.nome || "").localeCompare(
                          b.jogador.nome || ""
                        )
                      )
                      .map((timeJogador) => (
                        <button
                          key={timeJogador.id || timeJogador.jogador.id}
                          onClick={() => setGoalPlayerId(timeJogador.jogador.id)}
                          className="flex items-center justify-between p-4 rounded-2xl border border-app-border bg-app-bg hover:bg-green-500/10 hover:border-green-500/30 transition-all group"
                        >
                          <span className="font-bold text-app-text group-hover:text-green-500 transition-colors uppercase tracking-tight">
                            {timeJogador.jogador.nome}
                          </span>

                          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-black group-hover:bg-green-500 group-hover:text-white transition-all text-xs">
                            ⚽
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-app-border">
                    <div className="w-12 h-12 bg-green-500 flex items-center justify-center rounded-xl text-white font-black text-xl shadow-lg">
                      ⚽
                    </div>

                    <div>
                      <div className="text-[10px] font-black text-app-text-muted uppercase tracking-widest leading-none mb-1">
                        Goleador selecionado
                      </div>

                      <div className="text-lg font-black text-app-text uppercase tracking-tighter flex items-center gap-2">
                        {
                          selectedTeamPlayers.find(
                            (item) => item.jogador.id === goalPlayerId
                          )?.jogador.nome
                        }

                        <button
                          onClick={() => setGoalPlayerId(null)}
                          className="text-[10px] text-blue-500 hover:underline"
                        >
                          Alterar
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      selectedTimeId &&
                      goalPlayerId &&
                      handleRegisterEvent("gol", selectedTimeId, goalPlayerId)
                    }
                    className="w-full p-4 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-xl shadow-green-900/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    Confirmar gol deste jogador ⚽
                  </button>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-app-text-muted uppercase tracking-widest flex items-center gap-2">
                      <Handshake className="w-3 h-3" />
                      Ou selecione uma assistência
                    </label>

                    <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-60 pr-2">
                      <div className="pt-2 text-[10px] text-zinc-400 uppercase tracking-widest font-black opacity-50 px-2">
                        Garçons do {selectedTeam?.nome_time}:
                      </div>

                      {selectedTeamPlayers
                        .filter((item) => item.jogador.id !== goalPlayerId)
                        .sort((a, b) =>
                          (a.jogador.nome || "").localeCompare(
                            b.jogador.nome || ""
                          )
                        )
                        .map((timeJogador) => (
                          <button
                            key={timeJogador.id || timeJogador.jogador.id}
                            onClick={() =>
                              selectedTimeId &&
                              goalPlayerId &&
                              handleRegisterEvent(
                                "gol",
                                selectedTimeId,
                                goalPlayerId,
                                timeJogador.jogador.id
                              )
                            }
                            className="flex items-center justify-between p-4 rounded-2xl border border-app-border bg-app-bg hover:bg-blue-500/10 hover:border-blue-500/30 transition-all group"
                          >
                            <span className="font-bold text-app-text group-hover:text-blue-500 transition-colors uppercase tracking-tight">
                              {timeJogador.jogador.nome}
                            </span>

                            <Plus className="w-4 h-4 text-zinc-400 group-hover:text-blue-500" />
                          </button>
                        ))}

                      {selectedTeamPlayers.filter(
                        (item) => item.jogador.id !== goalPlayerId
                      ).length === 0 && (
                        <div className="text-center py-6 text-app-text-muted italic font-serif opacity-50 border border-dashed border-app-border rounded-2xl">
                          Não há outro jogador no time para assistência.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-app-card rounded-2xl w-full max-w-md border border-app-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-app-border flex items-center justify-between bg-zinc-950">
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                Registrar Cartão
              </h2>

              <button
                onClick={() => setShowCardModal(false)}
                className="p-2 text-zinc-400 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-app-text">
              {!cardPlayerId ? (
                <div className="space-y-4">
                  <div className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.2em] mb-2 px-2">
                    Quem recebeu o cartão?
                  </div>

                  <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-60 pr-2">
                    {selectedTeamPlayers
                      .sort((a, b) =>
                        (a.jogador.nome || "").localeCompare(
                          b.jogador.nome || ""
                        )
                      )
                      .map((timeJogador) => (
                        <button
                          key={timeJogador.id || timeJogador.jogador.id}
                          onClick={() =>
                            setCardPlayerId(timeJogador.jogador.id)
                          }
                          className="flex items-center justify-between p-4 rounded-2xl border border-app-border bg-app-bg hover:bg-yellow-500/10 hover:border-yellow-500/30 transition-all group"
                        >
                          <span className="font-bold text-app-text group-hover:text-yellow-500 transition-colors uppercase tracking-tight">
                            {timeJogador.jogador.nome}
                          </span>

                          <div className="w-3 h-4 bg-yellow-400 rounded-sm" />
                        </button>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={() =>
                      selectedTimeId &&
                      cardPlayerId &&
                      handleRegisterEvent(
                        "cartao_amarelo",
                        selectedTimeId,
                        cardPlayerId
                      )
                    }
                    className="w-full p-4 bg-yellow-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-yellow-600 transition"
                  >
                    Cartão Amarelo 🟨
                  </button>

                  <button
                    onClick={() =>
                      selectedTimeId &&
                      cardPlayerId &&
                      handleRegisterEvent(
                        "cartao_vermelho",
                        selectedTimeId,
                        cardPlayerId
                      )
                    }
                    className="w-full p-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition"
                  >
                    Cartão Vermelho 🟥
                  </button>

                  <button
                    onClick={() => setCardPlayerId(null)}
                    className="w-full p-3 text-app-text-muted hover:text-app-text transition text-xs font-black uppercase tracking-widest"
                  >
                    Escolher outro jogador
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-app-card rounded-[3rem] w-full max-w-2xl border border-app-border shadow-2xl overflow-hidden flex flex-col relative">
            <div className="absolute top-0 right-0 p-6">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X />
              </button>
            </div>

            <div className="bg-zinc-950 p-12 text-center relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-green-500/10 blur-[100px] pointer-events-none" />

              <div className="relative z-10">
                <div className="text-zinc-500 font-black uppercase tracking-[0.4em] text-[10px] mb-4">
                  Resultado Final
                </div>

                <div className="flex items-center justify-center gap-12">
                  <div className="text-center">
                    <div
                      className="text-[10px] font-black text-white px-3 py-1 rounded-full mb-3 uppercase tracking-widest"
                      style={{ backgroundColor: getTeamColor(0) }}
                    >
                      {matchTimes[0]?.nome_time || "Time 1"}
                    </div>

                    <div className="text-7xl font-black text-white font-mono">
                      {score.casa}
                    </div>
                  </div>

                  <div className="text-4xl font-black text-zinc-900 border-x border-zinc-900 px-8 py-2 italic transform -rotate-12">
                    VS
                  </div>

                  <div className="text-center">
                    <div
                      className="text-[10px] font-black text-white px-3 py-1 rounded-full mb-3 uppercase tracking-widest"
                      style={{ backgroundColor: getTeamColor(1) }}
                    >
                      {matchTimes[1]?.nome_time || "Time 2"}
                    </div>

                    <div className="text-7xl font-black text-white font-mono">
                      {score.visitante}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 flex-1 overflow-y-auto max-h-[50vh] space-y-10">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.2em] border-b border-app-border pb-3 flex items-center">
                    <Trophy className="w-3 h-3 mr-2 text-yellow-500" />
                    Artilharia
                  </h3>

                  <div className="space-y-3">
                    {Array.from(
                      new Set(
                        eventos
                          .filter((event) => event.tipo === "gol")
                          .map((event) => event.jogador_id)
                      )
                    )
                      .map((jogadorId) => ({
                        id: jogadorId,
                        nome:
                          eventos.find(
                            (event) => event.jogador_id === jogadorId
                          )?.jogador_nome || "Jogador",
                        gols: eventos.filter(
                          (event) =>
                            event.jogador_id === jogadorId &&
                            event.tipo === "gol"
                        ).length,
                      }))
                      .sort((a, b) => b.gols - a.gols)
                      .slice(0, 3)
                      .map((artilheiro, index) => (
                        <div
                          key={artilheiro.id}
                          className="flex justify-between items-center bg-app-bg p-3 rounded-2xl border border-app-border shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-zinc-400 font-mono italic">
                              #{index + 1}
                            </span>

                            <span
                              onClick={() =>
                                navigate(`/players/${artilheiro.id}`)
                              }
                              className="font-black text-app-text uppercase tracking-tight text-xs cursor-pointer hover:text-green-500"
                            >
                              {artilheiro.nome}
                            </span>
                          </div>

                          <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[10px] font-black">
                            {artilheiro.gols} GOLS
                          </span>
                        </div>
                      ))}

                    {eventos.filter((event) => event.tipo === "gol").length ===
                      0 && (
                      <p className="text-xs text-app-text-muted italic opacity-50">
                        Nenhum gol marcado.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.2em] border-b border-app-border pb-3 flex items-center">
                    <Handshake className="w-3 h-3 mr-2 text-blue-400" />
                    Garçons
                  </h3>

                  <div className="space-y-3">
                    {Array.from(
                      new Set(
                        eventos
                          .filter((event) => event.assistencia_nome)
                          .map((event) => event.jogador_assistencia_id)
                      )
                    )
                      .filter(Boolean)
                      .map((assistenteId) => {
                        const evento = eventos.find(
                          (item) =>
                            item.jogador_assistencia_id === assistenteId
                        );

                        return {
                          id: assistenteId,
                          nome: evento?.assistencia_nome || "Jogador",
                          assistencias: eventos.filter(
                            (item) =>
                              item.jogador_assistencia_id === assistenteId
                          ).length,
                        };
                      })
                      .sort((a, b) => b.assistencias - a.assistencias)
                      .slice(0, 3)
                      .map((garcom, index) => (
                        <div
                          key={garcom.id || index}
                          className="flex justify-between items-center bg-app-bg p-3 rounded-2xl border border-app-border shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-zinc-400 font-mono italic">
                              #{index + 1}
                            </span>

                            <span
                              onClick={() =>
                                garcom.id && navigate(`/players/${garcom.id}`)
                              }
                              className="font-black text-app-text uppercase tracking-tight text-xs cursor-pointer hover:text-blue-500"
                            >
                              {garcom.nome}
                            </span>
                          </div>

                          <span className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full text-[10px] font-black">
                            {garcom.assistencias} PASSES
                          </span>
                        </div>
                      ))}

                    {eventos.filter((event) => event.assistencia_nome).length ===
                      0 && (
                      <p className="text-xs text-app-text-muted italic opacity-50">
                        Nenhuma assistência.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-app-border flex justify-end gap-4">
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="px-8 py-3 rounded-2xl text-app-text-muted font-black uppercase tracking-widest text-[10px] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all border border-app-border"
                >
                  Voltar ao jogo
                </button>

                <button
                  onClick={handleFinalizarPartida}
                  className="px-10 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-green-900/20 active:scale-95 transition-all"
                >
                  CONFIRMAR FIM DE JOGO ⚽
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-app-card p-6 rounded-3xl border border-app-border shadow-md space-y-4">
        <h3 className="font-black text-app-text uppercase tracking-tight flex items-center gap-2">
          <Info className="w-4 h-4 text-app-text-muted" />
          Observação
        </h3>

        <p className="text-xs text-app-text-muted italic leading-relaxed">
          Esta tela usa WebSocket para receber atualizações de cronômetro,
          placar e eventos. Os botões chamam as rotas HTTP do backend, e o
          backend emite os eventos para atualizar a interface em tempo real.
        </p>
      </div>
    </div>
  );
};

export default PeladaLive;