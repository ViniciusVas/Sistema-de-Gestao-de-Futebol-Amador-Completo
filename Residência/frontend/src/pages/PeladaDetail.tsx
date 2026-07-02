import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Users,
  Search,
  Loader2,
  X,
  Play,
  RotateCcw,
  DollarSign,
  Info,
  GripVertical,
  Trophy,
  Calendar,
  MapPin,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { toast } from "react-hot-toast";
import api from "../services/api";
import { cn } from "../lib/utils";

interface Player {
  id: number;
  nome: string;
  nivel_estrelas: number;
  ativo: boolean;
}

interface Inscrito {
  id: number;
  jogador: number;
  jogador_nome: string;
  jogador_nivel: number;
  ordem_chegada: number;
  presenca_confirmada: boolean;
  pagamento_confirmado: boolean;
}

interface Pelada {
  id: number;
  titulo: string;
  data_hora: string;
  local: string;
  status: string;
  inscritos: Inscrito[];

  duracao_minutos?: number;
  jogadores_por_time?: number;
  times_simultaneos?: number;
  valor_por_jogador?: number;
  valor_total?: number;
  config_pagamento_visivel?: boolean;

  placar_time1?: number;
  placar_time2?: number;
  tempo_restante?: number | null;
  cronometro_ativo?: boolean;
  createdAt?: string;
  organizador_id?: number;
}

interface Rateio {
  quantidade_presentes: number;
  valor_por_jogador: number;
  valor_total: number;
}

interface PagamentoResponseItem {
  id: number;
  jogador_id: number;
  ordem_chegada: number;
  presenca_confirmada: boolean;
  pagamento_confirmado: boolean;
  jogador?: {
    id: number;
    nome: string;
    nivel_estrelas: number;
  };
}

interface ConfigForm {
  titulo: string;
  data_hora: string;
  local: string;
  duracao_minutos: string;
  jogadores_por_time: string;
  times_simultaneos: string;
  valor_por_jogador: string;
}

const PeladaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pelada, setPelada] = useState<Pelada | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [rateio, setRateio] = useState<Rateio | null>(null);
  const [configPagamentoVisivel, setConfigPagamentoVisivel] = useState(false);

  const [isFetching, setIsFetching] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "inscritos" | "pagamentos" | "config"
  >("inscritos");
  const [searchTerm, setSearchTerm] = useState("");

  const [configForm, setConfigForm] = useState<ConfigForm>({
    titulo: "",
    data_hora: "",
    local: "",
    duracao_minutos: "",
    jogadores_por_time: "",
    times_simultaneos: "",
    valor_por_jogador: "",
  });

  const isOrganizador = true;
  const canSeeFinance = true;

  const getErrorMessage = (error: any, fallback: string) => {
    return (
      error?.response?.data?.erro ||
      error?.response?.data?.error ||
      error?.response?.data?.mensagem ||
      fallback
    );
  };

  const ordenarInscritos = (inscritos: Inscrito[]) => {
    return [...inscritos].sort(
      (a, b) => (a.ordem_chegada || 0) - (b.ordem_chegada || 0)
    );
  };

  const formatDate = (date?: string) => {
    if (!date) {
      return "Data não informada";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Data não informada";
    }

    return parsedDate.toLocaleString("pt-BR");
  };

  const toDateTimeLocalValue = (date?: string) => {
    if (!date) {
      return "";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "";
    }

    const timezoneOffset = parsedDate.getTimezoneOffset() * 60000;
    const localDate = new Date(parsedDate.getTime() - timezoneOffset);

    return localDate.toISOString().slice(0, 16);
  };

  const updateConfigField = (field: keyof ConfigForm, value: string) => {
    setConfigForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const fetchData = async () => {
    if (!id) return;

    setIsFetching(true);

    try {
      const [peladaResponse, jogadoresResponse, peladasResponse] =
        await Promise.all([
          api.get(`/peladas/${id}`),
          api.get("/jogadores"),
          api.get("/peladas"),
        ]);

      const peladaDaLista = Array.isArray(peladasResponse.data)
        ? peladasResponse.data.find(
            (item: Pelada) => Number(item.id) === Number(id)
          )
        : null;

      let peladaData: Pelada = {
        ...(peladaDaLista || {}),
        ...peladaResponse.data,
        inscritos: ordenarInscritos(peladaResponse.data.inscritos || []),
      };

      try {
        const pagamentosResponse = await api.get(`/peladas/${id}/pagamentos`);

        setConfigPagamentoVisivel(
          Boolean(pagamentosResponse.data.config_pagamento_visivel)
        );

        if (Array.isArray(pagamentosResponse.data.jogadores)) {
          const inscritosPagamento: Inscrito[] =
            pagamentosResponse.data.jogadores.map(
              (item: PagamentoResponseItem) => ({
                id: item.id,
                jogador: item.jogador_id,
                jogador_nome: item.jogador?.nome || "Jogador",
                jogador_nivel: Number(item.jogador?.nivel_estrelas || 0),
                ordem_chegada: item.ordem_chegada || 0,
                presenca_confirmada: Boolean(item.presenca_confirmada),
                pagamento_confirmado: Boolean(item.pagamento_confirmado),
              })
            );

          peladaData = {
            ...peladaData,
            inscritos: ordenarInscritos(inscritosPagamento),
          };
        }
      } catch (pagamentoError) {
        console.warn("Não foi possível carregar pagamentos:", pagamentoError);
      }

      try {
        const rateioResponse = await api.get(`/peladas/${id}/rateio`);
        setRateio(rateioResponse.data);
      } catch (rateioError) {
        console.warn("Não foi possível carregar rateio:", rateioError);
        setRateio(null);
      }

      const activePlayers = jogadoresResponse.data
        .filter((player: Player) => player.ativo)
        .sort((a: Player, b: Player) =>
          (a.nome || "").localeCompare(b.nome || "")
        );

      setPelada(peladaData);
      setAvailablePlayers(activePlayers);
    } catch (error) {
      console.error("Erro ao carregar dados da pelada:", error);
      toast.error(getErrorMessage(error, "Erro ao carregar dados da pelada."));
      setPelada(null);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!pelada) return;

    setConfigForm({
      titulo: pelada.titulo || "",
      data_hora: toDateTimeLocalValue(pelada.data_hora),
      local: pelada.local || "",
      duracao_minutos:
        pelada.duracao_minutos !== undefined
          ? String(pelada.duracao_minutos)
          : "",
      jogadores_por_time:
        pelada.jogadores_por_time !== undefined
          ? String(pelada.jogadores_por_time)
          : "",
      times_simultaneos:
        pelada.times_simultaneos !== undefined
          ? String(pelada.times_simultaneos)
          : "",
      valor_por_jogador:
        pelada.valor_por_jogador !== undefined
          ? String(pelada.valor_por_jogador)
          : "",
    });
  }, [pelada]);

  const handleAddPlayer = async (jogadorId: number) => {
    if (!id) return;

    try {
      await api.post(`/peladas/${id}/jogadores`, {
        jogador_id: jogadorId,
      });

      toast.success("Jogador adicionado!");
      setIsAddModalOpen(false);
      setSearchTerm("");
      await fetchData();
    } catch (error) {
      console.error("Erro ao adicionar jogador:", error);
      toast.error(getErrorMessage(error, "Erro ao adicionar jogador."));
    }
  };

  const handleRemovePlayer = async (jogadorId: number) => {
    if (!id) return;

    if (!window.confirm("Deseja realmente remover este jogador da pelada?")) {
      return;
    }

    try {
      await api.delete(`/peladas/${id}/jogadores/${jogadorId}`);

      toast.success("Jogador removido.");
      await fetchData();
    } catch (error) {
      console.error("Erro ao remover jogador:", error);
      toast.error(getErrorMessage(error, "Erro ao remover jogador."));
    }
  };

  const handleTogglePresence = async (
    jogadorId: number,
    current: boolean
  ) => {
    if (!id) return;

    try {
      await api.put(`/peladas/${id}/jogadores/confirmar-presenca`, {
        jogador_id: jogadorId,
        confirmar: !current,
      });

      toast.success(!current ? "Presença confirmada!" : "Presença removida.");
      await fetchData();
    } catch (error) {
      console.error("Erro ao atualizar presença:", error);
      toast.error(getErrorMessage(error, "Erro ao atualizar presença."));
    }
  };

  const handleTogglePayment = async (
    jogadorId: number,
    current: boolean
  ) => {
    if (!id) return;

    try {
      await api.put(`/peladas/${id}/pagamentos/${jogadorId}`, {
        pagamento_confirmado: !current,
      });

      toast.success(!current ? "Pagamento confirmado!" : "Pagamento cancelado.");
      await fetchData();
    } catch (error) {
      console.error("Erro ao atualizar pagamento:", error);
      toast.error(getErrorMessage(error, "Erro ao atualizar pagamento."));
    }
  };

  const handleToggleFinanceVisibility = async () => {
    if (!id) return;

    const newValue = !configPagamentoVisivel;

    setConfigPagamentoVisivel(newValue);

    try {
      await api.put(`/peladas/${id}/config-pagamento`, {
        config_pagamento_visivel: newValue,
      });

      toast.success("Configuração de pagamento atualizada!");
      await fetchData();
    } catch (error) {
      console.error("Erro ao atualizar configuração de pagamento:", error);
      setConfigPagamentoVisivel(!newValue);
      toast.error(
        getErrorMessage(error, "Erro ao atualizar configuração de pagamento.")
      );
    }
  };

  const persistOrder = async (items: Inscrito[]) => {
    if (!id) return;

    const reordered = items.map((item, index) => ({
      ...item,
      ordem_chegada: index + 1,
    }));

    setPelada((prev) =>
      prev
        ? {
            ...prev,
            inscritos: reordered,
          }
        : prev
    );

    try {
      await api.put(`/peladas/${id}/jogadores/reordenar`, {
        ordem: reordered.map((item) => item.jogador),
      });

      toast.success("Ordem atualizada!");
      await fetchData();
    } catch (error) {
      console.error("Erro ao reordenar jogadores:", error);
      toast.error(getErrorMessage(error, "Erro ao reordenar jogadores."));
      await fetchData();
    }
  };

  const movePlayer = async (index: number, direction: "up" | "down") => {
    if (!pelada) return;

    const items = Array.from(pelada.inscritos || []);
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= items.length) {
      return;
    }

    const [movedItem] = items.splice(index, 1);
    items.splice(targetIndex, 0, movedItem);

    await persistOrder(items);
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !pelada) return;

    const items = Array.from(pelada.inscritos || []);
    const [reorderedItem] = items.splice(result.source.index, 1);

    items.splice(result.destination.index, 0, reorderedItem);

    await persistOrder(items);
  };

  const handleSaveConfig = async () => {
    if (!id) return;

    const tituloTratado = configForm.titulo.trim();
    const localTratado = configForm.local.trim();

    const duracaoMinutos = Number(configForm.duracao_minutos);
    const jogadoresPorTime = Number(configForm.jogadores_por_time);
    const timesSimultaneos = Number(configForm.times_simultaneos);
    const valorPorJogador = configForm.valor_por_jogador.trim()
      ? Number(configForm.valor_por_jogador)
      : 0;

    if (!tituloTratado) {
      toast.error("Informe o título da pelada.");
      return;
    }

    if (!configForm.data_hora) {
      toast.error("Informe a data e hora da pelada.");
      return;
    }

    if (!localTratado) {
      toast.error("Informe o local da pelada.");
      return;
    }

    if (!duracaoMinutos || duracaoMinutos <= 0) {
      toast.error("Informe uma duração válida.");
      return;
    }

    if (!jogadoresPorTime || jogadoresPorTime <= 0) {
      toast.error("Informe a quantidade de jogadores por time.");
      return;
    }

    if (!timesSimultaneos || timesSimultaneos <= 0) {
      toast.error("Informe a quantidade de times simultâneos.");
      return;
    }

    if (Number.isNaN(valorPorJogador) || valorPorJogador < 0) {
      toast.error("Informe um valor por jogador válido.");
      return;
    }

    setIsSavingConfig(true);

    try {
      const payload = {
        titulo: tituloTratado,
        data_hora: new Date(configForm.data_hora).toISOString(),
        local: localTratado,
        duracao_minutos: duracaoMinutos,
        jogadores_por_time: jogadoresPorTime,
        times_simultaneos: timesSimultaneos,
        valor_por_jogador: valorPorJogador,
      };

      await api.put(`/peladas/${id}`, payload);

      toast.success("Configurações atualizadas!");
      await fetchData();
    } catch (error) {
      console.error("Erro ao atualizar pelada:", error);
      toast.error(getErrorMessage(error, "Erro ao atualizar pelada."));
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleFinalizarPelada = async () => {
    if (!id) return;

    if (
      !window.confirm(
        "Confirmar encerramento? As estatísticas serão processadas no backend."
      )
    ) {
      return;
    }

    try {
      await api.post(`/peladas/${id}/finalizar`);

      toast.success("Pelada finalizada com sucesso!");
      await fetchData();
    } catch (error) {
      console.error("Erro ao finalizar pelada:", error);
      toast.error(getErrorMessage(error, "Erro ao finalizar pelada."));
    }
  };

  const filteredAvailable = availablePlayers.filter(
    (player) =>
      player.nome.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !pelada?.inscritos.some((inscrito) => inscrito.jogador === player.id)
  );

  if (!pelada && !isFetching) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="text-app-text-muted text-lg italic text-center">
          Pelada não encontrada ou erro ao carregar.
          <br />
          <span className="text-xs opacity-50 block mt-2">ID: {id}</span>
          <span className="text-xs opacity-50 block">
            API: {import.meta.env.VITE_API_URL || "/api"}
          </span>
        </div>

        <button
          onClick={fetchData}
          className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition"
        >
          Tentar Novamente
        </button>

        <button
          onClick={() => navigate("/peladas")}
          className="text-app-text-muted hover:text-app-text transition"
        >
          Voltar para Lista
        </button>
      </div>
    );
  }

  if (isFetching && !pelada) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!pelada) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="text-app-text-muted text-lg italic uppercase tracking-widest font-black">
          Pelada não encontrada
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

  const inscritos = pelada.inscritos || [];
  const confirmados = inscritos.filter((item) => item.presenca_confirmada);
  const pagos = confirmados.filter((item) => item.pagamento_confirmado);

  const valorPorPessoa = Number(
    rateio?.valor_por_jogador ?? pelada.valor_por_jogador ?? 0
  );
  const valorTotal = Number(
    rateio?.valor_total ?? confirmados.length * valorPorPessoa
  );
  const totalArrecadado = pagos.length * valorPorPessoa;
  const progressoPagamento =
    (pagos.length / Math.max(1, confirmados.length)) * 100;

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/peladas")}
        className="flex items-center text-app-text-muted hover:text-green-500 transition"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Voltar para Peladas
      </button>

      <div className="bg-app-card rounded-2xl border border-app-border p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-app-text uppercase tracking-tighter">
              {pelada.titulo || "Pelada"}
            </h1>

            <p className="text-app-text-muted font-medium italic flex flex-wrap items-center gap-2 mt-1">
              <MapPin className="w-4 h-4" />
              {pelada.local || "Local não definido"}
              <span>•</span>
              <Calendar className="w-4 h-4" />
              {formatDate(pelada.data_hora)}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/peladas/${id}/sorteio`)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-100 px-6 py-2.5 rounded-xl flex items-center hover:bg-zinc-800 transition font-black uppercase tracking-widest text-[10px] shadow-lg"
            >
              <Users className="w-3.5 h-3.5 mr-2" />
              Sorteio Automático
            </button>

            <button
              onClick={() => navigate(`/peladas/${id}/live`)}
              className={cn(
                "px-6 py-2.5 rounded-xl flex items-center transition font-black uppercase tracking-widest text-[10px] shadow-lg",
                pelada.status === "encerrada" || pelada.status === "finalizada"
                  ? "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700"
                  : "bg-green-600 text-white hover:bg-green-700 shadow-green-900/20"
              )}
            >
              <Play className="w-3.5 h-3.5 mr-2 fill-current" />
              {pelada.status === "encerrada" || pelada.status === "finalizada"
                ? "Ver Resumo/Súmula"
                : "Jogo ao Vivo"}
            </button>
          </div>
        </div>
      </div>

      {pelada.status === "em_andamento" && (
        <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">
                  Partida em Andamento
                </span>
              </div>

              <div className="text-4xl font-black text-white font-mono tracking-tighter flex items-center gap-4">
                {pelada.placar_time1 || 0}
                <span className="text-zinc-700 mx-2 text-xl italic uppercase font-sans">
                  VS
                </span>
                {pelada.placar_time2 || 0}
              </div>
            </div>

            <button
              onClick={() => navigate(`/peladas/${id}/live`)}
              className="group flex items-center gap-3 bg-white/5 border border-white/10 hover:bg-white/10 px-6 py-3 rounded-xl transition-all"
            >
              <span className="text-xs font-black text-white uppercase tracking-widest">
                Ver Painel Completo
              </span>

              <Play className="w-4 h-4 text-green-500 fill-current group-hover:scale-125 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {(pelada.status === "finalizada" || pelada.status === "encerrada") && (
        <div className="bg-gradient-to-br from-green-950/40 to-zinc-950 rounded-[2.5rem] border border-green-500/10 p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-green-500" />
                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">
                  Resumo do Jogo Concluído
                </span>
              </div>

              <div className="text-5xl font-black text-white font-mono tracking-tighter flex items-center gap-4">
                {pelada.placar_time1 || 0}
                <span className="text-zinc-700 mx-2 text-xl italic uppercase font-sans">
                  VS
                </span>
                {pelada.placar_time2 || 0}
              </div>

              <p className="text-xs text-zinc-400 mt-2 uppercase font-black tracking-wider">
                Partida finalizada. As estatísticas foram processadas pelo
                backend.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("inscritos")}
          className={cn(
            "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            activeTab === "inscritos"
              ? "bg-white dark:bg-zinc-900 shadow-sm text-app-text"
              : "text-app-text-muted hover:text-app-text"
          )}
        >
          Inscritos
        </button>

        {canSeeFinance && (
          <button
            onClick={() => setActiveTab("pagamentos")}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === "pagamentos"
                ? "bg-white dark:bg-zinc-900 shadow-sm text-app-text"
                : "text-app-text-muted hover:text-app-text"
            )}
          >
            Pagamentos
          </button>
        )}

        <button
          onClick={() => setActiveTab("config")}
          className={cn(
            "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            activeTab === "config"
              ? "bg-white dark:bg-zinc-900 shadow-sm text-app-text"
              : "text-app-text-muted hover:text-app-text"
          )}
        >
          Configurações
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {activeTab === "inscritos" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-black text-app-text flex items-center uppercase tracking-tighter">
                  <Users className="w-6 h-6 mr-3 text-green-500" />
                  Lista de Presença ({inscritos.length})
                </h2>

                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-green-600/10 text-green-600 text-xs font-black px-4 py-2 rounded-xl hover:bg-green-600 hover:text-white transition uppercase tracking-widest border border-green-500/20"
                >
                  <Plus className="w-4 h-4 mr-1 inline" />
                  Adicionar Jogador
                </button>
              </div>

              <div className="bg-app-card rounded-[2rem] border border-app-border overflow-hidden shadow-xl">
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="players">
                    {(provided) => (
                      <table
                        className="min-w-full divide-y divide-app-border"
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                      >
                        <thead className="bg-zinc-50 dark:bg-zinc-900">
                          <tr>
                            <th className="px-8 py-5 text-left font-black text-app-text-muted uppercase tracking-widest text-[10px]">
                              #
                            </th>

                            <th className="px-8 py-5 text-left font-black text-app-text-muted uppercase tracking-widest text-[10px]">
                              Jogador
                            </th>

                            <th className="px-8 py-5 text-center font-black text-app-text-muted uppercase tracking-widest text-[10px]">
                              Confirmado
                            </th>

                            {isOrganizador && (
                              <th className="px-8 py-5 text-right font-black text-app-text-muted uppercase tracking-widest text-[10px]">
                                Ações
                              </th>
                            )}
                          </tr>
                        </thead>

                        <tbody className="bg-app-card divide-y divide-app-border/40">
                          {inscritos.map((pj, index) => (
                            <Draggable
                              key={pj.id}
                              draggableId={String(pj.id)}
                              index={index}
                            >
                              {(dragProvided, snapshot) => (
                                <tr
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  className={cn(
                                    "hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors",
                                    !pj.presenca_confirmada &&
                                      "opacity-40 grayscale-[0.5]",
                                    snapshot.isDragging &&
                                      "bg-zinc-100 dark:bg-zinc-800 shadow-2xl z-50 rounded-xl"
                                  )}
                                >
                                  <td className="px-8 py-5 whitespace-nowrap">
                                    <div className="flex items-center gap-4">
                                      <div
                                        {...dragProvided.dragHandleProps}
                                        className="text-zinc-400 hover:text-zinc-600"
                                      >
                                        <GripVertical className="w-4 h-4" />
                                      </div>

                                      <span className="text-xs font-black text-app-text-muted font-mono">
                                        {index + 1}º
                                      </span>
                                    </div>
                                  </td>

                                  <td className="px-8 py-5 whitespace-nowrap">
                                    <div className="font-black text-app-text uppercase tracking-tight text-sm">
                                      {pj.jogador_nome}
                                    </div>

                                    <div className="text-[10px] text-yellow-500 font-black tracking-widest uppercase">
                                      NÍVEL{" "}
                                      {Number(pj.jogador_nivel || 0).toFixed(1)}{" "}
                                      ★
                                    </div>
                                  </td>

                                  <td className="px-8 py-5 whitespace-nowrap text-center">
                                    <button
                                      onClick={() =>
                                        isOrganizador &&
                                        handleTogglePresence(
                                          pj.jogador,
                                          pj.presenca_confirmada
                                        )
                                      }
                                      disabled={!isOrganizador}
                                      className={cn(
                                        "mx-auto w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all shadow-sm",
                                        pj.presenca_confirmada
                                          ? "bg-green-500 border-green-600 text-white shadow-green-500/20"
                                          : "border-app-border bg-app-bg text-transparent"
                                      )}
                                    >
                                      <CheckCircle2 className="w-5 h-5" />
                                    </button>
                                  </td>

                                  {isOrganizador && (
                                    <td className="px-8 py-5 whitespace-nowrap text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <div className="flex flex-col gap-1 mr-2">
                                          <button
                                            onClick={() => movePlayer(index, "up")}
                                            className="p-1 text-app-text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition"
                                          >
                                            <ArrowUp className="w-3 h-3" />
                                          </button>

                                          <button
                                            onClick={() =>
                                              movePlayer(index, "down")
                                            }
                                            className="p-1 text-app-text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition"
                                          >
                                            <ArrowDown className="w-3 h-3" />
                                          </button>
                                        </div>

                                        <button
                                          onClick={() =>
                                            handleRemovePlayer(pj.jogador)
                                          }
                                          className="p-2.5 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-500/20 shadow-sm"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              )}
                            </Draggable>
                          ))}

                          {provided.placeholder}

                          {inscritos.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-8 py-20 text-center">
                                <div className="text-app-text-muted italic font-serif opacity-40">
                                  Nenhum jogador na lista.
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            </div>
          )}

          {activeTab === "pagamentos" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-black text-app-text flex items-center uppercase tracking-tighter">
                  <DollarSign className="w-6 h-6 mr-3 text-blue-500" />
                  Controle de Pagamentos
                </h2>

                {isOrganizador && (
                  <div className="bg-blue-600/10 px-4 py-2 rounded-2xl border border-blue-500/20 flex items-center gap-3">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest whitespace-nowrap">
                      Visível para visitantes
                    </span>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={configPagamentoVisivel}
                        onChange={handleToggleFinanceVisibility}
                      />

                      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 shadow-inner" />
                    </label>
                  </div>
                )}
              </div>

              <div className="bg-app-card rounded-[2rem] border border-app-border overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-app-border">
                    <thead className="bg-zinc-50 dark:bg-zinc-900">
                      <tr>
                        <th className="px-8 py-5 text-left font-black text-app-text-muted uppercase tracking-widest text-[10px]">
                          Jogador
                        </th>

                        <th className="px-8 py-5 text-center font-black text-app-text-muted uppercase tracking-widest text-[10px]">
                          Status
                        </th>

                        <th className="px-8 py-5 text-center font-black text-app-text-muted uppercase tracking-widest text-[10px]">
                          Rateio
                        </th>

                        {isOrganizador && (
                          <th className="px-8 py-5 text-right font-black text-app-text-muted uppercase tracking-widest text-[10px]">
                            Confirmar
                          </th>
                        )}
                      </tr>
                    </thead>

                    <tbody className="bg-app-card divide-y divide-app-border/40">
                      {confirmados
                        .sort((a, b) =>
                          (a.jogador_nome || "").localeCompare(
                            b.jogador_nome || ""
                          )
                        )
                        .map((pj) => (
                          <tr
                            key={pj.id}
                            className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors"
                          >
                            <td className="px-8 py-5 whitespace-nowrap">
                              <div className="font-black text-app-text uppercase tracking-tight text-sm">
                                {pj.jogador_nome}
                              </div>
                            </td>

                            <td className="px-8 py-5 whitespace-nowrap text-center">
                              <span
                                className={cn(
                                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                  pj.pagamento_confirmado
                                    ? "bg-green-500/10 text-green-500 border border-green-500/20"
                                    : "bg-red-500/10 text-red-500 border border-red-500/20"
                                )}
                              >
                                {pj.pagamento_confirmado ? "Pago" : "Pendente"}
                              </span>
                            </td>

                            <td className="px-8 py-5 whitespace-nowrap text-center font-mono font-black text-xs text-app-text-muted">
                              R$ {valorPorPessoa.toFixed(2)}
                            </td>

                            {isOrganizador && (
                              <td className="px-8 py-5 whitespace-nowrap text-right">
                                <button
                                  onClick={() =>
                                    handleTogglePayment(
                                      pj.jogador,
                                      pj.pagamento_confirmado
                                    )
                                  }
                                  className={cn(
                                    "p-2.5 rounded-xl transition-all border shadow-sm",
                                    pj.pagamento_confirmado
                                      ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white"
                                      : "bg-green-600 text-white border-green-700 hover:bg-green-700"
                                  )}
                                >
                                  <DollarSign className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}

                      {confirmados.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-8 py-20 text-center italic text-app-text-muted opacity-40 font-serif"
                          >
                            Aguardando confirmações de presença para ratear o
                            custo.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "config" && (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-app-text flex items-center uppercase tracking-tighter px-2">
                <RotateCcw className="w-6 h-6 mr-3 text-orange-500" />
                Configurações da Partida
              </h2>

              <div className="bg-app-card rounded-[2rem] border border-app-border p-8 shadow-xl space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-app-text-muted uppercase tracking-widest px-1">
                      Título da Pelada
                    </label>

                    <input
                      type="text"
                      className="w-full bg-app-bg border border-app-border rounded-2xl px-5 py-3 text-sm font-bold text-app-text focus:border-green-500 transition-all outline-none"
                      value={configForm.titulo}
                      onChange={(e) =>
                        updateConfigField("titulo", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-app-text-muted uppercase tracking-widest px-1">
                      Local / Endereço
                    </label>

                    <input
                      type="text"
                      className="w-full bg-app-bg border border-app-border rounded-2xl px-5 py-3 text-sm font-bold text-app-text focus:border-green-500 transition-all outline-none"
                      value={configForm.local}
                      onChange={(e) =>
                        updateConfigField("local", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-app-text-muted uppercase tracking-widest px-1">
                      Data e Hora
                    </label>

                    <input
                      type="datetime-local"
                      className="w-full bg-app-bg border border-app-border rounded-2xl px-5 py-3 text-sm font-bold text-app-text focus:border-green-500 transition-all outline-none"
                      value={configForm.data_hora}
                      onChange={(e) =>
                        updateConfigField("data_hora", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-app-text-muted uppercase tracking-widest px-1">
                      Duração (min)
                    </label>

                    <input
                      type="number"
                      min={1}
                      className="w-full bg-app-bg border border-app-border rounded-2xl px-5 py-3 text-sm font-bold text-app-text focus:border-green-500 transition-all outline-none"
                      value={configForm.duracao_minutos}
                      onChange={(e) =>
                        updateConfigField("duracao_minutos", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-app-text-muted uppercase tracking-widest px-1">
                      Valor p/ Jogador
                    </label>

                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-full bg-app-bg border border-app-border rounded-2xl px-5 py-3 text-sm font-bold text-app-text focus:border-green-500 transition-all outline-none"
                      value={configForm.valor_por_jogador}
                      onChange={(e) =>
                        updateConfigField("valor_por_jogador", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-app-text-muted uppercase tracking-widest px-1">
                      Jogadores p/ Time
                    </label>

                    <input
                      type="number"
                      min={1}
                      className="w-full bg-app-bg border border-app-border rounded-2xl px-5 py-3 text-sm font-bold text-app-text focus:border-green-500 transition-all outline-none"
                      value={configForm.jogadores_por_time}
                      onChange={(e) =>
                        updateConfigField("jogadores_por_time", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-app-text-muted uppercase tracking-widest px-1">
                      Times Simultâneos
                    </label>

                    <input
                      type="number"
                      min={1}
                      className="w-full bg-app-bg border border-app-border rounded-2xl px-5 py-3 text-sm font-bold text-app-text focus:border-green-500 transition-all outline-none"
                      value={configForm.times_simultaneos}
                      onChange={(e) =>
                        updateConfigField(
                          "times_simultaneos",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-app-text-muted uppercase tracking-widest px-1">
                      Status
                    </label>

                    <div className="w-full bg-app-bg border border-app-border rounded-2xl px-5 py-3 text-sm font-bold text-app-text">
                      {pelada.status || "Não informado"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-4 border-t border-app-border">
                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    disabled={isSavingConfig}
                    className="bg-green-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-xl disabled:opacity-50"
                  >
                    {isSavingConfig ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Salvar Configurações"
                    )}
                  </button>

                  {pelada.status !== "encerrada" &&
                    pelada.status !== "finalizada" && (
                      <button
                        onClick={handleFinalizarPelada}
                        className="bg-zinc-900 border border-zinc-800 text-zinc-100 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl"
                      >
                        Finalizar Partida
                      </button>
                    )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-950 rounded-[2.5rem] border border-zinc-900 p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[60px] -mr-16 -mt-16" />

            <div className="relative z-10 space-y-6">
              <div>
                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 text-center">
                  Resumo Financeiro
                </div>

                <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-black text-zinc-400">
                    VALOR TOTAL
                  </span>

                  <div className="flex items-center text-4xl font-black text-white tracking-tighter">
                    <span className="text-zinc-600 text-lg mr-1 font-mono">
                      R$
                    </span>
                    {valorTotal.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-zinc-800/50">
                <div className="text-center">
                  <div className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-1">
                    Confirmados
                  </div>

                  <div className="text-2xl font-black text-white font-mono">
                    {confirmados.length}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-1">
                    Por Pessoa
                  </div>

                  <div className="text-2xl font-black text-blue-500 font-mono tracking-tight leading-none pt-1">
                    <span className="text-[10px] font-black block text-zinc-600 mb-1">
                      R$
                    </span>
                    {valorPorPessoa.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 shadow-inner">
                  <div
                    style={{ width: `${progressoPagamento}%` }}
                    className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                  />
                </div>

                <div className="flex justify-between mt-3">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    Já pagaram
                  </span>

                  <span className="text-[10px] font-black text-white bg-zinc-800 px-2 py-0.5 rounded-lg border border-zinc-700">
                    {pagos.length} de {confirmados.length}
                  </span>
                </div>

                <div className="text-center mt-6">
                  <div className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-1">
                    TOTAL ARRECADADO
                  </div>

                  <div className="text-3xl font-black text-green-500 font-mono tracking-tighter">
                    R$ {totalArrecadado.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-app-card p-6 rounded-3xl border border-app-border shadow-md space-y-4">
            <h3 className="font-black text-app-text uppercase tracking-tight flex items-center gap-2">
              <Info className="w-4 h-4 text-app-text-muted" />
              Dica Pro
            </h3>

            <p className="text-xs text-app-text-muted italic leading-relaxed">
              Use o botão{" "}
              <span className="font-bold text-green-600">
                Sorteio Automático
              </span>{" "}
              no topo para equilibrar as estrelas e gerar times justos. O rateio
              é calculado apenas com base nos jogadores que confirmaram presença.
            </p>
          </div>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-app-card rounded-2xl w-full max-w-md border border-app-border shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-app-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-app-text">
                Adicionar à Lista
              </h2>

              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-app-text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 bg-zinc-100 dark:bg-zinc-800/50 border-b border-app-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-text-muted" />

                <input
                  type="text"
                  className="w-full pl-10 pr-3 py-2 border border-app-border bg-app-bg rounded-lg text-sm text-app-text"
                  placeholder="Buscar jogador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredAvailable.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-app-border hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  <div>
                    <div className="font-bold text-app-text">{player.nome}</div>

                    <div className="text-xs text-yellow-500 font-medium">
                      {Number(player.nivel_estrelas || 0).toFixed(1)} ★
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddPlayer(player.id)}
                    className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {filteredAvailable.length === 0 && (
                <div className="text-center py-8 space-y-4">
                  <div className="text-app-text-muted text-sm font-serif italic">
                    Nenhum jogador disponível.
                  </div>

                  <button
                    onClick={() => navigate("/players")}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700 transition"
                  >
                    Criar Novo Jogador
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeladaDetail;