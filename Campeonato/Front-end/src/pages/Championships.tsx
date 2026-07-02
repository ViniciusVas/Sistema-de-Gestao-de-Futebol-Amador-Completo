import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  Trophy, Loader2, Calendar, Settings, Plus, X,
  ToggleLeft, ToggleRight, Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

interface Championship {
  id: string;
  nome: string;
  formato: string;
  modalidade: string;
  tipo: string;
  data_inicio: string;
  data_fim: string;
  status: string;
}

interface FormData {
  nome: string;
  descricao: string;
  regulamento: string;
  data_inicio: string;
  data_fim: string;
  formato: "pontos_corridos" | "grupos_mata_mata";
  modalidade: "futebol";
  tipo: "pequeno" | "medio" | "grande";
  jogos_ida_volta: boolean;
  criterios_desempate: string[];
  num_grupos: number;
  classificados_por_grupo: number;
}

const CRITERIOS = [
  { value: "saldo_de_gols", label: "Saldo de gols" },
  { value: "confronto_direto", label: "Confronto direto" },
  { value: "numero_de_vitorias", label: "Número de vitórias" },
];

const TIPO_TIMES: Record<string, Record<string, number>> = {
  pontos_corridos: { pequeno: 5, medio: 10, grande: 20 },
  grupos_mata_mata: { pequeno: 8, medio: 16, grande: 32 },
};

const defaultForm = (): FormData => ({
  nome: "",
  descricao: "",
  regulamento: "",
  data_inicio: "",
  data_fim: "",
  formato: "pontos_corridos",
  modalidade: "futebol" as const,
  tipo: "pequeno",
  jogos_ida_volta: false,
  criterios_desempate: [],
  num_grupos: 2,
  classificados_por_grupo: 2,
});

const Championships = () => {
  const navigate = useNavigate();
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormData>(defaultForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchChampionships();
  }, []);

  const fetchChampionships = async () => {
    try {
      const response = await api.get("/campeonatos/");
      setChampionships(Array.isArray(response.data) ? response.data : []);
    } catch {
      setChampionships([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = () => {
    setForm(defaultForm());
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const set = (field: keyof FormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const addCriterio = (value: string) => {
    setForm((prev) => ({
      ...prev,
      criterios_desempate: prev.criterios_desempate.includes(value)
        ? prev.criterios_desempate
        : [...prev.criterios_desempate, value],
    }));
  };

  const removeCriterio = (value: string) => {
    setForm((prev) => ({
      ...prev,
      criterios_desempate: prev.criterios_desempate.filter((c) => c !== value),
    }));
  };

  const moveCriterio = (index: number, direction: -1 | 1) => {
    setForm((prev) => {
      const arr = [...prev.criterios_desempate];
      const target = index + direction;
      if (target < 0 || target >= arr.length) return prev;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return { ...prev, criterios_desempate: arr };
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.nome.trim()) errs.nome = "Nome é obrigatório.";
    if (form.data_inicio && form.data_fim && form.data_fim < form.data_inicio)
      errs.data_fim = "A data de término deve ser após o início.";
    if (form.formato === "grupos_mata_mata" && form.num_grupos < 2)
      errs.num_grupos = "Mínimo de 2 grupos.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await api.post("/campeonatos/", {
        nome: form.nome.trim(),
        descricao: form.descricao.trim(),
        regulamento: form.regulamento.trim(),
        data_inicio: form.data_inicio || null,
        data_fim: form.data_fim || null,
        formato: form.formato,
        modalidade: form.modalidade,
        tipo: form.tipo,
        jogos_ida_volta: form.jogos_ida_volta,
        criterios_desempate: form.criterios_desempate,
        num_grupos: form.formato === "grupos_mata_mata" ? form.num_grupos : 2,
        classificados_por_grupo:
          form.formato === "grupos_mata_mata" ? form.classificados_por_grupo : 2,
      });
      toast.success("Campeonato criado com sucesso!");
      closeModal();
      fetchChampionships();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      if (data && typeof data === "object") {
        const apiErrors: Record<string, string> = {};
        for (const [k, v] of Object.entries(data)) {
          apiErrors[k] = Array.isArray(v) ? v.join(" ") : String(v);
        }
        setErrors(apiErrors);
      } else {
        toast.error("Erro ao criar campeonato.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChamp = async (e: React.MouseEvent, champ: Championship) => {
    e.stopPropagation();
    if (!window.confirm(`Excluir o campeonato "${champ.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/campeonatos/${champ.id}/`);
      toast.success("Campeonato excluído.");
      fetchChampionships();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) toast.error("Campeonato não encontrado ou sem permissão.");
      else toast.error("Erro ao excluir campeonato.");
    }
  };

  const formatoLabel = (fmt: string) =>
    fmt === "pontos_corridos" ? "Pontos Corridos" : "Grupos + Mata-Mata";

  const modalidadeLabel = (_m: string) => "Futebol";

  const timesLabel = (formato: string, tipo: string) => {
    const n = TIPO_TIMES[formato]?.[tipo];
    return n ? `${n} times` : "";
  };

  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-text flex items-center uppercase tracking-tight">
            <Trophy className="mr-2 h-6 w-6 text-yellow-500" />
            Campeonatos
          </h1>
          <p className="text-app-text-muted font-medium">
            Acompanhe os torneios e ligas disponíveis.
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2 rounded-xl transition-all text-sm shadow-md"
        >
          <Plus className="h-4 w-4" />
          Novo Campeonato
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
        </div>
      ) : championships.length === 0 ? (
        <div className="text-center py-20 bg-app-card rounded-3xl border-2 border-dashed border-app-border">
          <Trophy className="mx-auto h-16 w-16 text-app-text-muted opacity-20 mb-4" />
          <p className="text-app-text-muted font-medium italic">
            Nenhum campeonato disponível no momento.
          </p>
          <button
            onClick={openModal}
            className="mt-4 flex items-center gap-2 mx-auto bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2 rounded-xl transition-all text-sm"
          >
            <Plus className="h-4 w-4" />
            Criar o primeiro
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {championships.map((champ) => (
            <div
              key={champ.id}
              onClick={() => navigate(`/championships/${champ.id}`)}
              className="bg-app-card p-6 rounded-2xl border border-app-border hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer group shadow-sm relative"
            >
              <button
                onClick={(e) => handleDeleteChamp(e, champ)}
                className="absolute top-3 right-3 p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition opacity-0 group-hover:opacity-100"
                title="Excluir campeonato"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <div className="flex items-center mb-4">
                <div className="bg-yellow-500/10 p-4 rounded-2xl mr-4 group-hover:scale-110 transition shadow-inner">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <h3 className="text-lg font-bold text-app-text truncate uppercase tracking-tight">
                    {champ.nome}
                  </h3>
                  <div className="flex items-center mt-1">
                    <span
                      className={`w-2 h-2 rounded-full mr-2 shadow-sm ${
                        champ.status === "ativo"
                          ? "bg-green-500 shadow-green-500/50"
                          : "bg-zinc-300 dark:bg-zinc-700"
                      }`}
                    />
                    <span className="text-[10px] text-app-text-muted uppercase font-black tracking-widest">
                      {champ.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-app-border text-[10px] font-black uppercase tracking-widest">
                <div className="text-app-text-muted">
                  <div className="flex items-center mb-1">
                    <Calendar className="w-3 h-3 mr-1" /> Início
                  </div>
                  <div className="text-app-text font-bold">
                    {champ.data_inicio
                      ? new Date(champ.data_inicio + "T00:00:00").toLocaleDateString()
                      : "A definir"}
                  </div>
                </div>
                <div className="text-app-text-muted">
                  <div className="flex items-center mb-1">
                    <Settings className="w-3 h-3 mr-1" /> Formato
                  </div>
                  <div className="text-app-text font-bold">
                    {formatoLabel(champ.formato)}
                  </div>
                </div>
                <div className="text-app-text-muted col-span-2">
                  <div className="text-app-text font-bold">
                    {modalidadeLabel(champ.modalidade)} · {champ.tipo}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal de criação ──────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-app-card border border-app-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-app-border shrink-0">
              <h2 className="text-lg font-bold text-app-text uppercase tracking-tight flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Novo Campeonato
              </h2>
              <button
                onClick={closeModal}
                className="text-app-text-muted hover:text-app-text transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scroll body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

              {/* Informações gerais */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-app-text-muted mb-3">
                  Informações Gerais
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-app-text mb-1">
                      Nome do campeonato <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.nome}
                      onChange={(e) => set("nome", e.target.value)}
                      placeholder="Ex: Liga Municipal 2026"
                      className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-sm text-app-text placeholder:text-app-text-muted focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                    />
                    {errors.nome && (
                      <p className="text-red-500 text-xs mt-1">{errors.nome}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-app-text mb-1">
                      Descrição
                    </label>
                    <textarea
                      value={form.descricao}
                      onChange={(e) => set("descricao", e.target.value)}
                      rows={2}
                      placeholder="Breve descrição do campeonato..."
                      className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-sm text-app-text placeholder:text-app-text-muted focus:outline-none focus:ring-2 focus:ring-yellow-500/40 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-app-text mb-1">
                      Regulamento
                    </label>
                    <textarea
                      value={form.regulamento}
                      onChange={(e) => set("regulamento", e.target.value)}
                      rows={3}
                      placeholder="Regras e regulamento do campeonato..."
                      className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-sm text-app-text placeholder:text-app-text-muted focus:outline-none focus:ring-2 focus:ring-yellow-500/40 resize-none"
                    />
                  </div>
                </div>
              </section>

              {/* Datas */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-app-text-muted mb-3">
                  Período
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-app-text mb-1">
                      Data de início
                    </label>
                    <input
                      type="date"
                      value={form.data_inicio}
                      onChange={(e) => set("data_inicio", e.target.value)}
                      className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-app-text mb-1">
                      Data de término
                    </label>
                    <input
                      type="date"
                      value={form.data_fim}
                      onChange={(e) => set("data_fim", e.target.value)}
                      className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                    />
                    {errors.data_fim && (
                      <p className="text-red-500 text-xs mt-1">{errors.data_fim}</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Formato da competição */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-app-text-muted mb-3">
                  Formato da Competição
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {(["pontos_corridos", "grupos_mata_mata"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => set("formato", fmt)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        form.formato === fmt
                          ? "border-yellow-500 bg-yellow-500/10"
                          : "border-app-border bg-app-bg hover:border-yellow-500/40"
                      }`}
                    >
                      <div className="font-bold text-xs text-app-text uppercase tracking-tight">
                        {fmt === "pontos_corridos" ? "Pontos Corridos" : "Grupos + Mata-Mata"}
                      </div>
                      <div className="text-app-text-muted text-[10px] mt-0.5">
                        {fmt === "pontos_corridos"
                          ? "Todos jogam entre si"
                          : "Fase de grupos + eliminatórias"}
                      </div>
                    </button>
                  ))}
                </div>

                {form.formato === "grupos_mata_mata" && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-bold text-app-text mb-1">
                        Número de grupos
                      </label>
                      <input
                        type="number"
                        min={2}
                        value={form.num_grupos}
                        onChange={(e) => set("num_grupos", Number(e.target.value))}
                        className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                      />
                      {errors.num_grupos && (
                        <p className="text-red-500 text-xs mt-1">{errors.num_grupos}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-app-text mb-1">
                        Classificados por grupo
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={form.classificados_por_grupo}
                        onChange={(e) =>
                          set("classificados_por_grupo", Number(e.target.value))
                        }
                        className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                      />
                    </div>
                  </div>
                )}
              </section>

              {/* Tamanho */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-app-text-muted mb-3">
                  Tamanho
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-app-text mb-1">
                      Tamanho (capacidade de times)
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(["pequeno", "medio", "grande"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => set("tipo", t)}
                          className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                            form.tipo === t
                              ? "border-yellow-500 bg-yellow-500/10"
                              : "border-app-border bg-app-bg hover:border-yellow-500/40"
                          }`}
                        >
                          <div className="text-xs font-bold text-app-text capitalize">
                            {t === "medio" ? "Médio" : t.charAt(0).toUpperCase() + t.slice(1)}
                          </div>
                          <div className="text-[10px] text-app-text-muted mt-0.5">
                            {timesLabel(form.formato, t)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Configuração de jogos */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-app-text-muted mb-3">
                  Configuração de Jogos
                </h3>
                <button
                  type="button"
                  onClick={() => set("jogos_ida_volta", !form.jogos_ida_volta)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    form.jogos_ida_volta
                      ? "border-yellow-500 bg-yellow-500/10"
                      : "border-app-border bg-app-bg"
                  }`}
                >
                  <div className="text-left">
                    <div className="text-sm font-bold text-app-text">
                      {form.jogos_ida_volta ? "Ida e volta" : "Apenas ida"}
                    </div>
                    <div className="text-xs text-app-text-muted">
                      {form.jogos_ida_volta
                        ? "Cada dupla de times joga duas partidas"
                        : "Cada dupla de times joga uma partida"}
                    </div>
                  </div>
                  {form.jogos_ida_volta ? (
                    <ToggleRight className="h-7 w-7 text-yellow-500 shrink-0" />
                  ) : (
                    <ToggleLeft className="h-7 w-7 text-app-text-muted shrink-0" />
                  )}
                </button>
              </section>

              {/* Critérios de desempate */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-app-text-muted mb-1">
                  Critérios de Desempate
                </h3>
                <p className="text-[10px] text-app-text-muted mb-3">
                  Aplicados em ordem quando dois times empatam em pontos. Clique para adicionar.
                </p>

                {/* Lista ordenada dos selecionados */}
                {form.criterios_desempate.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    {form.criterios_desempate.map((value, idx) => {
                      const label = CRITERIOS.find((c) => c.value === value)?.label ?? value;
                      return (
                        <div
                          key={value}
                          className="flex items-center gap-2 p-2.5 rounded-xl border-2 border-yellow-500 bg-yellow-500/10"
                        >
                          <span className="w-5 h-5 rounded-full bg-yellow-500 text-black text-[10px] font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="flex-1 text-sm font-medium text-app-text">{label}</span>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => moveCriterio(idx, -1)}
                              disabled={idx === 0}
                              className="p-1 rounded text-app-text-muted hover:text-app-text disabled:opacity-30 transition"
                              title="Mover para cima"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => moveCriterio(idx, 1)}
                              disabled={idx === form.criterios_desempate.length - 1}
                              className="p-1 rounded text-app-text-muted hover:text-app-text disabled:opacity-30 transition"
                              title="Mover para baixo"
                            >
                              ▼
                            </button>
                            <button
                              type="button"
                              onClick={() => removeCriterio(value)}
                              className="p-1 rounded text-red-400 hover:text-red-300 transition ml-1"
                              title="Remover"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Critérios disponíveis para adicionar */}
                <div className="flex flex-wrap gap-2">
                  {CRITERIOS.filter((c) => !form.criterios_desempate.includes(c.value)).map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => addCriterio(c.value)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-app-border bg-app-bg text-xs font-medium text-app-text-muted hover:border-yellow-500/60 hover:text-app-text transition"
                    >
                      <span className="text-yellow-500 font-bold">+</span>
                      {c.label}
                    </button>
                  ))}
                  {CRITERIOS.every((c) => form.criterios_desempate.includes(c.value)) && (
                    <p className="text-[11px] text-app-text-muted italic">Todos os critérios adicionados.</p>
                  )}
                </div>

                {errors.criterios_desempate && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.criterios_desempate}
                  </p>
                )}
              </section>
            </form>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-app-border shrink-0">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl border border-app-border text-app-text font-bold text-sm hover:bg-app-bg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trophy className="h-4 w-4" />
                )}
                {saving ? "Criando..." : "Criar Campeonato"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Championships;
