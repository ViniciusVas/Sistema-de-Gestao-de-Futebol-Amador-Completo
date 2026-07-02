import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  ChevronLeft,
  Shuffle,
  GitCompare,
  Save,
  RotateCcw,
  Loader2,
  Users,
  Star as StarIcon,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../services/api";
import { cn } from "../lib/utils";

interface Pelada {
  id: number;
  titulo: string;
  status?: string;
}

interface TimeJogador {
  id: number;
  jogador_id: number;
  jogador: {
    id: number;
    nome: string;
    nivel_estrelas: number;
  };
}

interface Time {
  id: number;
  nome_time: string;
  cor?: string | null;
  soma_estrelas: number;
  ordem?: number;
  em_jogo: boolean;
  jogadores: TimeJogador[];
}

interface HistoryEntry {
  id: string;
  previousTimes: Time[];
  description: string;
  createdAt: string;
}

const MAX_HISTORY_ENTRIES = 20;

const PeladaSorteio = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [movingPlayer, setMovingPlayer] = useState(false);
  const [undoing, setUndoing] = useState(false);

  const [times, setTimes] = useState<Time[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [pelada, setPelada] = useState<Pelada | null>(null);

  const getErrorMessage = (error: any, fallback: string) => {
    return (
      error?.response?.data?.erro ||
      error?.response?.data?.error ||
      error?.response?.data?.mensagem ||
      fallback
    );
  };

  const getHistoryStorageKey = () => {
    return `pelada-sorteio-history-${id}`;
  };

  const cloneTimes = (items: Time[]): Time[] => {
    return JSON.parse(JSON.stringify(items));
  };

  const calculateTeamStars = (jogadores: TimeJogador[]) => {
    return jogadores.reduce(
      (acc, item) => acc + Number(item.jogador?.nivel_estrelas || 0),
      0
    );
  };

  const normalizeTime = (time: any): Time => {
    const jogadores: TimeJogador[] = (time.jogadores || []).map(
      (item: any) => {
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
      }
    );

    return {
      id: Number(time.id),
      nome_time: time.nome_time || `Time ${time.ordem || ""}`,
      cor: time.cor || null,
      soma_estrelas: Number(
        time.soma_estrelas ?? calculateTeamStars(jogadores)
      ),
      ordem: Number(time.ordem),
      em_jogo: Boolean(time.em_jogo),
      jogadores,
    };
  };

  const sortTimes = (items: Time[]) => {
    return [...items].sort((a, b) => {
      const ordemA = a.ordem ?? a.id;
      const ordemB = b.ordem ?? b.id;

      return ordemA - ordemB;
    });
  };

  const persistHistory = (entries: HistoryEntry[]) => {
    if (!id || typeof window === "undefined") return;

    try {
      sessionStorage.setItem(
        getHistoryStorageKey(),
        JSON.stringify(entries)
      );
    } catch (error) {
      console.warn("Não foi possível salvar o histórico do sorteio:", error);
    }
  };

  const updateHistory = (
    updater: (previousHistory: HistoryEntry[]) => HistoryEntry[]
  ) => {
    setHistory((previousHistory) => {
      const nextHistory = updater(previousHistory);
      persistHistory(nextHistory);

      return nextHistory;
    });
  };

  const addHistorySnapshot = (
    previousTimes: Time[],
    description: string
  ) => {
    if (previousTimes.length === 0) return;

    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      previousTimes: cloneTimes(previousTimes),
      description,
      createdAt: new Date().toISOString(),
    };

    updateHistory((previousHistory) => [
      ...previousHistory,
      entry,
    ].slice(-MAX_HISTORY_ENTRIES));
  };

  const removeLastHistoryEntry = () => {
    updateHistory((previousHistory) => previousHistory.slice(0, -1));
  };

  const clearHistory = () => {
    setHistory([]);

    if (!id || typeof window === "undefined") return;

    try {
      sessionStorage.removeItem(getHistoryStorageKey());
    } catch (error) {
      console.warn("Não foi possível limpar o histórico do sorteio:", error);
    }
  };

  const loadHistoryFromStorage = () => {
    if (!id || typeof window === "undefined") {
      setHistory([]);
      return;
    }

    try {
      const storedHistory = sessionStorage.getItem(getHistoryStorageKey());

      if (!storedHistory) {
        setHistory([]);
        return;
      }

      const parsedHistory = JSON.parse(storedHistory);

      if (!Array.isArray(parsedHistory)) {
        setHistory([]);
        return;
      }

      const validHistory: HistoryEntry[] = parsedHistory
        .filter(
          (entry: any) =>
            Array.isArray(entry?.previousTimes) &&
            entry.previousTimes.length > 0
        )
        .map((entry: any) => ({
          id:
            entry.id ||
            `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          previousTimes: sortTimes(
            entry.previousTimes.map((time: any) => normalizeTime(time))
          ),
          description: entry.description || "Alteração anterior",
          createdAt: entry.createdAt || new Date().toISOString(),
        }))
        .slice(-MAX_HISTORY_ENTRIES);

      setHistory(validHistory);
    } catch (error) {
      console.warn("Não foi possível carregar o histórico do sorteio:", error);
      setHistory([]);
    }
  };

  const getTeamColor = (index: number) => {
    if (index === 0) return "#ef4444";
    if (index === 1) return "#3b82f6";
    return "#3f3f46";
  };

  const fetchTimes = async (showLoading = true) => {
    if (!id) return;

    if (showLoading) {
      setLoading(true);
    }

    try {
      const [peladaResponse, timesResponse] = await Promise.all([
        api.get(`/peladas/${id}`),
        api.get(`/peladas/${id}/times`),
      ]);

      setPelada({
        id: Number(peladaResponse.data.id),
        titulo: peladaResponse.data.titulo,
        status: peladaResponse.data.status,
      });

      const normalizedTimes = sortTimes(
        (timesResponse.data || []).map((time: any) => normalizeTime(time))
      );

      setTimes(normalizedTimes);
    } catch (error) {
      console.error("Erro ao carregar times:", error);
      toast.error(getErrorMessage(error, "Erro ao carregar times."));
      setTimes([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadHistoryFromStorage();
    fetchTimes();
  }, [id]);

  const handleSorteio = async (tipo: "aleatorio" | "balanceado") => {
    if (!id || sorting || movingPlayer || undoing) return;

    const previousTimes = cloneTimes(times);

    setSorting(true);

    try {
      await api.post(`/peladas/${id}/sortear?tipo=${tipo}`);

      await fetchTimes(false);

      if (previousTimes.length > 0) {
        addHistorySnapshot(
          previousTimes,
          tipo === "balanceado"
            ? "Sorteio balanceado gerado"
            : "Sorteio aleatório gerado"
        );
      }

      toast.success(
        tipo === "balanceado"
          ? "Sorteio balanceado realizado!"
          : "Sorteio aleatório realizado!"
      );
    } catch (error) {
      console.error("Erro ao sortear times:", error);

      toast.error(
        getErrorMessage(
          error,
          "Erro ao sortear times. Verifique se há jogadores confirmados."
        )
      );
    } finally {
      setSorting(false);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;

    if (!id || !destination || movingPlayer || undoing || sorting) return;

    if (source.droppableId === destination.droppableId) {
      return;
    }

    const previousTimes = cloneTimes(times);
    const newTimes = cloneTimes(times);

    const sourceTimeIndex = newTimes.findIndex(
      (time) => String(time.id) === source.droppableId
    );

    const destinationTimeIndex = newTimes.findIndex(
      (time) => String(time.id) === destination.droppableId
    );

    if (sourceTimeIndex === -1 || destinationTimeIndex === -1) {
      return;
    }

    const sourceTime = newTimes[sourceTimeIndex];
    const destinationTime = newTimes[destinationTimeIndex];

    const [movedPlayer] = sourceTime.jogadores.splice(source.index, 1);

    if (!movedPlayer) {
      return;
    }

    destinationTime.jogadores.splice(destination.index, 0, movedPlayer);

    sourceTime.soma_estrelas = calculateTeamStars(sourceTime.jogadores);
    destinationTime.soma_estrelas = calculateTeamStars(
      destinationTime.jogadores
    );

    setTimes(sortTimes(newTimes));
    setMovingPlayer(true);

    try {
      await api.post(`/peladas/${id}/times/ajustar`, {
        jogadorId: movedPlayer.jogador.id,
        novoTimeId: destinationTime.id,
        peladaId: Number(id),
      });

      await fetchTimes(false);

      addHistorySnapshot(
        previousTimes,
        `${movedPlayer.jogador.nome} foi movido de ${sourceTime.nome_time} para ${destinationTime.nome_time}`
      );

      toast.success("Jogador movido entre os times.");
    } catch (error) {
      console.error("Erro ao mover jogador:", error);

      toast.error(
        getErrorMessage(error, "Erro ao mover jogador entre times.")
      );

      setTimes(previousTimes);
    } finally {
      setMovingPlayer(false);
    }
  };

  const handleUndo = async () => {
    if (
      !id ||
      history.length === 0 ||
      undoing ||
      sorting ||
      movingPlayer ||
      saving
    ) {
      return;
    }

    const lastEntry = history[history.length - 1];

    setUndoing(true);

    try {
      const response = await api.post(`/peladas/${id}/times/restaurar`, {
        times: lastEntry.previousTimes,
      });

      const restoredTimes = Array.isArray(response.data?.times)
        ? sortTimes(
            response.data.times.map((time: any) => normalizeTime(time))
          )
        : [];

      if (restoredTimes.length > 0) {
        setTimes(restoredTimes);
      } else {
        await fetchTimes(false);
      }

      removeLastHistoryEntry();

      toast.success(`Desfeito: ${lastEntry.description}`);
    } catch (error) {
      console.error("Erro ao restaurar formação anterior:", error);

      toast.error(
        getErrorMessage(
          error,
          "Erro ao desfazer a última alteração dos times."
        )
      );

      await fetchTimes(false);
    } finally {
      setUndoing(false);
    }
  };

  const handleConfirm = async () => {
    if (!id || saving || sorting || movingPlayer || undoing) return;

    setSaving(true);

    try {
      await api.post(`/peladas/${id}/times/confirmar`);

      clearHistory();

      toast.success("Times confirmados! Jogo iniciado.");
      navigate(`/peladas/${id}/live`);
    } catch (error) {
      console.error("Erro ao confirmar times:", error);
      toast.error(getErrorMessage(error, "Erro ao confirmar times."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        <p className="text-app-text-muted italic">Carregando times...</p>
      </div>
    );
  }

  if (!pelada) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="text-app-text-muted text-lg italic">
          Pelada não encontrada.
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

  const actionsDisabled = sorting || movingPlayer || undoing || saving;

  return (
    <div className="space-y-6 pb-20">
      <button
        onClick={() => navigate(`/peladas/${id}`)}
        className="flex items-center text-app-text-muted hover:text-green-500 transition"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Voltar para Detalhes
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-text uppercase tracking-tight">
            Sorteio de Times
          </h1>

          <p className="text-app-text-muted font-medium italic">
            {pelada.titulo} • {times.length} times formados
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleSorteio("aleatorio")}
            disabled={actionsDisabled}
            className="flex items-center px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-app-text-muted rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition font-black uppercase tracking-widest text-[10px] border border-app-border disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sorting ? (
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
            ) : (
              <Shuffle className="w-3.5 h-3.5 mr-2" />
            )}
            Sorteio Aleatório
          </button>

          <button
            onClick={() => handleSorteio("balanceado")}
            disabled={actionsDisabled}
            className="flex items-center px-4 py-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition font-black uppercase tracking-widest text-[10px] border border-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GitCompare className="w-3.5 h-3.5 mr-2" />
            Sorteio Balanceado
          </button>
        </div>
      </div>

      {history.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="text-xs font-medium text-app-text-muted">
            Há {history.length}{" "}
            {history.length === 1
              ? "alteração disponível para desfazer."
              : "alterações disponíveis para desfazer."}
          </p>

          <span className="text-[10px] uppercase tracking-widest font-black text-amber-600 dark:text-amber-400">
            Última: {history[history.length - 1].description}
          </span>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {times.map((time, index) => (
            <div key={time.id} className="flex flex-col space-y-3">
              <div className="flex justify-between items-center px-1">
                <h3 className="font-bold text-app-text flex items-center uppercase tracking-tighter">
                  <span
                    className="w-3 h-3 rounded-full mr-2 shadow-sm"
                    style={{ backgroundColor: getTeamColor(index) }}
                  />

                  {time.nome_time}

                  {!time.em_jogo && (
                    <span className="ml-2 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-app-text-muted px-1.5 py-0.5 rounded font-black uppercase tracking-widest border border-app-border">
                      Próxima
                    </span>
                  )}
                </h3>

                <div className="text-sm font-black text-yellow-500 flex items-center">
                  <StarIcon className="w-3.5 h-3.5 mr-1 fill-yellow-500" />
                  {Number(time.soma_estrelas || 0).toFixed(1)}
                </div>
              </div>

              <Droppable
                droppableId={String(time.id)}
                isDropDisabled={actionsDisabled}
              >
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={cn(
                      "rounded-2xl border-2 border-dashed min-h-[220px] p-3 space-y-2 transition-all shadow-inner",
                      snapshot.isDraggingOver
                        ? "bg-green-500/5 border-green-500/30"
                        : "bg-app-card border-app-border"
                    )}
                  >
                    {time.jogadores.map((timeJogador, playerIndex) => (
                      <Draggable
                        key={timeJogador.jogador.id}
                        draggableId={String(timeJogador.jogador.id)}
                        index={playerIndex}
                        isDragDisabled={actionsDisabled}
                      >
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={cn(
                              "p-3 rounded-xl border shadow-sm flex justify-between items-center transition-all",
                              dragSnapshot.isDragging
                                ? "shadow-2xl scale-105 bg-app-card border-blue-500 z-50 ring-2 ring-blue-500/20"
                                : "bg-app-bg border-app-border hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                            )}
                          >
                            <div className="font-bold text-app-text uppercase tracking-tight text-sm">
                              {timeJogador.jogador.nome}
                            </div>

                            <div className="text-[10px] font-black text-app-text-muted font-mono">
                              {Number(
                                timeJogador.jogador.nivel_estrelas || 0
                              ).toFixed(1)}{" "}
                              ★
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}

                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}

          {times.length === 0 && (
            <div className="col-span-full py-20 text-center bg-app-card rounded-3xl border-2 border-dashed border-app-border">
              <Users className="mx-auto h-12 w-12 text-app-text-muted opacity-20 mb-4" />

              <p className="text-app-text-muted italic">
                Nenhum time formado. Confirme jogadores na pelada e clique em
                um botão de sorteio.
              </p>
            </div>
          )}
        </div>
      </DragDropContext>

      <div className="fixed bottom-0 left-0 right-0 bg-app-bg/80 backdrop-blur-md border-t border-app-border p-4 shadow-2xl flex justify-center z-40">
        <div className="max-w-4xl w-full flex justify-between items-center gap-4">
          <button
            onClick={handleUndo}
            disabled={history.length === 0 || actionsDisabled}
            title="Restaura a formação anterior dos times"
            className="flex items-center px-4 py-2 text-app-text-muted hover:text-app-text disabled:opacity-30 disabled:cursor-not-allowed transition font-bold uppercase tracking-widest text-[10px]"
          >
            {undoing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4 mr-2" />
            )}

            Desfazer última alteração
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/peladas/${id}`)}
              disabled={actionsDisabled}
              className="px-6 py-2 border border-app-border bg-app-card text-app-text rounded-lg font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shadow-sm uppercase tracking-widest text-[10px] disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              onClick={handleConfirm}
              disabled={saving || times.length === 0 || actionsDisabled}
              className="px-8 py-2 bg-green-600 text-white rounded-lg font-black hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg shadow-green-900/20 uppercase tracking-widest text-[10px]"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}

              Confirmar Times
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeladaSorteio;