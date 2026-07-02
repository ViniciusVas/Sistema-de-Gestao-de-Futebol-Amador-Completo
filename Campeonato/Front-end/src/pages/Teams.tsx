import React, { useState, useEffect, useRef } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { Users, Plus, Pencil, Trash2, Loader2, X, Upload, Shield, Star, UserPlus, UserMinus, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "../lib/utils";

interface Team {
  id: string;
  nome: string;
  escudo: string;
  escudo_url: string;
  cor: string;
  total_jogadores: number;
}

interface Membro {
  id: string;
  jogador: number;
  nome: string;
  numero: number | null;
  nivel_estrelas: number | null;
  ativo: boolean | null;
}

interface JogadorBanco {
  id: string;
  nome: string;
  nivel_estrelas: number;
  ativo: boolean;
}

const CORES_RAPIDAS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
  "#1d4ed8", "#b45309", "#065f46", "#7c3aed",
];

const defaultForm = () => ({
  nome: "",
  escudo: "",
  cor: "#3b82f6",
});

const TeamAvatar = ({ team, size = 12 }: { team: Pick<Team, "nome" | "escudo" | "escudo_url" | "cor">; size?: number }) => {
  const src = team.escudo || team.escudo_url;
  const s = `w-${size} h-${size}`;
  if (src) {
    return <img src={src} alt={team.nome} className={`${s} rounded-xl object-cover border border-app-border`} />;
  }
  return (
    <div
      className={`${s} rounded-xl flex items-center justify-center text-white font-black text-xl shrink-0`}
      style={{ backgroundColor: team.cor || "#3b82f6" }}
    >
      {team.nome.charAt(0).toUpperCase()}
    </div>
  );
};

const Teams = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [form, setForm] = useState(defaultForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  // Elenco modal
  const [elencoTeam, setElencoTeam] = useState<Team | null>(null);
  const [elenco, setElenco] = useState<Membro[]>([]);
  const [bancoBusca, setBancoBusca] = useState("");
  const [banco, setBanco] = useState<JogadorBanco[]>([]);
  const [loadingElenco, setLoadingElenco] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => { fetchTeams(); }, []);

  const fetchTeams = async () => {
    try {
      const res = await api.get("/times/");
      setTeams(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Erro ao carregar times.");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (team?: Team) => {
    if (team) {
      setEditing(team);
      setForm({ nome: team.nome, escudo: team.escudo, cor: team.cor || "#3b82f6" });
    } else {
      setEditing(null);
      setForm(defaultForm());
    }
    setErrors({});
    setShowModal(true);
  };

  const handleEscudo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem muito grande. Máximo 2 MB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setForm((p) => ({ ...p, escudo: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.nome.trim()) errs.nome = "Nome é obrigatório.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { nome: form.nome.trim(), escudo: form.escudo, cor: form.cor };
      if (editing) {
        await api.patch(`/times/${editing.id}/`, payload);
        toast.success("Time atualizado!");
      } else {
        await api.post("/times/", payload);
        toast.success("Time criado!");
      }
      setShowModal(false);
      fetchTeams();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      if (data && typeof data === "object") {
        const apiErrors: Record<string, string> = {};
        for (const [k, v] of Object.entries(data)) {
          apiErrors[k] = Array.isArray(v) ? v.join(" ") : String(v);
        }
        setErrors(apiErrors);
      } else {
        toast.error("Erro ao salvar time.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (team: Team) => {
    if (!window.confirm(`Excluir o time "${team.nome}"?`)) return;
    try {
      await api.delete(`/times/${team.id}/`);
      toast.success("Time excluído.");
      fetchTeams();
    } catch {
      toast.error("Erro ao excluir time.");
    }
  };

  // --- Elenco ---

  const openElenco = async (team: Team) => {
    setElencoTeam(team);
    setBancoBusca("");
    setLoadingElenco(true);
    try {
      const [elencoRes, bancoRes] = await Promise.all([
        api.get(`/times/${team.id}/elenco/`),
        api.get("/jogadores/"),
      ]);
      setElenco(Array.isArray(elencoRes.data) ? elencoRes.data : []);
      setBanco(Array.isArray(bancoRes.data) ? bancoRes.data : []);
    } catch {
      toast.error("Erro ao carregar elenco.");
    } finally {
      setLoadingElenco(false);
    }
  };

  const closeElenco = () => {
    setElencoTeam(null);
    fetchTeams();
  };

  const handleAddJogador = async (jogador: JogadorBanco) => {
    if (!elencoTeam) return;
    setAddingId(jogador.id);
    try {
      const res = await api.post(`/times/${elencoTeam.id}/elenco/`, { jogador_id: jogador.id });
      setElenco((prev) => [...prev, res.data]);
      toast.success(`${jogador.nome} adicionado!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.jogador_id || "Erro ao adicionar jogador.");
    } finally {
      setAddingId(null);
    }
  };

  const handleRemoveMembro = async (membro: Membro) => {
    setRemovingId(membro.id);
    try {
      await api.delete(`/elenco/${membro.id}/`);
      setElenco((prev) => prev.filter((m) => m.id !== membro.id));
      toast.success(`${membro.nome} removido.`);
    } catch {
      toast.error("Erro ao remover jogador.");
    } finally {
      setRemovingId(null);
    }
  };

  const elencoIds = new Set(elenco.map((m) => String(m.jogador)));
  const bancofiltrado = banco.filter(
    (j) => !elencoIds.has(String(j.id)) &&
      j.nome.toLowerCase().includes(bancoBusca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-text flex items-center uppercase tracking-tight">
            <Shield className="mr-2 h-6 w-6 text-blue-500" />
            Meus Times
          </h1>
          <p className="text-app-text-muted font-medium">Gerencie os times e seus elencos.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl transition text-sm shadow-md"
        >
          <Plus className="h-4 w-4" /> Novo Time
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-20 bg-app-card rounded-3xl border-2 border-dashed border-app-border">
          <Shield className="mx-auto h-16 w-16 text-app-text-muted opacity-20 mb-4" />
          <p className="text-app-text-muted font-medium italic">Nenhum time cadastrado ainda.</p>
          <button
            onClick={() => openModal()}
            className="mt-4 flex items-center gap-2 mx-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl transition text-sm"
          >
            <Plus className="h-4 w-4" /> Criar primeiro time
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <div key={team.id} className="bg-app-card border border-app-border rounded-2xl p-5 shadow-sm group">
              <div className="flex items-center gap-4">
                <TeamAvatar team={team} size={14} />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-app-text uppercase tracking-tight truncate">{team.nome}</p>

                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-3 h-3 rounded-full border border-app-border" style={{ backgroundColor: team.cor || "#3b82f6" }} />
                    <span className="text-[10px] text-app-text-muted font-mono">{team.cor || "—"}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => openModal(team)} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(team)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => openElenco(team)}
                className={`mt-4 w-full flex items-center justify-between px-3 py-2 rounded-xl border transition text-sm ${
                  team.total_jogadores === 0
                    ? "bg-amber-500/5 border-amber-500/40 hover:border-amber-500"
                    : "bg-app-bg border-app-border hover:border-blue-500/50"
                }`}
              >
                <span className={`flex items-center gap-2 font-medium ${team.total_jogadores === 0 ? "text-amber-500" : "text-app-text-muted"}`}>
                  {team.total_jogadores === 0
                    ? <AlertTriangle className="h-4 w-4 text-amber-500" />
                    : <Users className="h-4 w-4 text-blue-500" />
                  }
                  <span>
                    {team.total_jogadores === 0
                      ? "Sem jogadores — clique para adicionar"
                      : `${team.total_jogadores} jogador${team.total_jogadores !== 1 ? "es" : ""} no elenco`
                    }
                  </span>
                </span>
                <ChevronRight className={`h-4 w-4 ${team.total_jogadores === 0 ? "text-amber-500" : "text-app-text-muted"}`} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar/Editar Time */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-app-card border border-app-border rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-app-border shrink-0">
              <h2 className="text-lg font-bold text-app-text uppercase tracking-tight flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                {editing ? "Editar Time" : "Novo Time"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-app-text-muted hover:text-app-text transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-5">
              {/* Escudo */}
              <div>
                <label className="block text-xs font-bold text-app-text mb-2">Escudo do time</label>
                <div className="flex items-center gap-4">
                  <div
                    className="w-20 h-20 rounded-2xl border-2 border-dashed border-app-border flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-blue-500 transition"
                    onClick={() => fileRef.current?.click()}
                  >
                    {form.escudo ? (
                      <img src={form.escudo} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-app-text-muted">
                        <Upload className="h-6 w-6 mb-1" />
                        <span className="text-[10px]">Upload</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-blue-500 font-bold hover:underline">
                      Selecionar imagem
                    </button>
                    {form.escudo && (
                      <button type="button" onClick={() => setForm((p) => ({ ...p, escudo: "" }))} className="block text-xs text-red-400 font-bold hover:underline">
                        Remover
                      </button>
                    )}
                    <p className="text-[10px] text-app-text-muted">JPG, PNG ou SVG — máx. 2 MB</p>
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleEscudo} />
              </div>

              {/* Nome */}
              <div>
                <label className="block text-xs font-bold text-app-text mb-1">
                  Nome do time <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Leões FC"
                  className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-sm text-app-text placeholder:text-app-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
                {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome}</p>}
              </div>

              {/* Cor principal */}
              <div>
                <label className="block text-xs font-bold text-app-text mb-2">Cor principal</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {CORES_RAPIDAS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, cor: c }))}
                      className={`w-7 h-7 rounded-lg border-2 transition ${form.cor === c ? "border-white scale-110 shadow-lg" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.cor}
                    onChange={(e) => setForm((p) => ({ ...p, cor: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-app-border cursor-pointer bg-transparent"
                  />
                  <span className="text-sm font-mono text-app-text">{form.cor}</span>
                </div>
              </div>
            </form>

            <div className="flex gap-3 px-6 py-4 border-t border-app-border shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-app-border text-app-text font-bold text-sm hover:bg-app-bg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                {saving ? "Salvando..." : editing ? "Salvar" : "Criar Time"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Elenco */}
      {elencoTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-app-card border border-app-border rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-app-border shrink-0">
              <div className="flex items-center gap-3">
                <TeamAvatar team={elencoTeam} size={10} />
                <div>
                  <h2 className="text-lg font-bold text-app-text uppercase tracking-tight">{elencoTeam.nome}</h2>
                  <p className="text-xs text-app-text-muted">{elenco.length} jogador{elenco.length !== 1 ? "es" : ""} no elenco</p>
                </div>
              </div>
              <button onClick={closeElenco} className="text-app-text-muted hover:text-app-text transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingElenco ? (
              <div className="flex justify-center py-16">
                <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
              </div>
            ) : (
              <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">

                {/* Elenco atual */}
                <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-app-border min-h-0">
                  <div className="px-4 py-3 border-b border-app-border bg-zinc-100 dark:bg-zinc-800/50 shrink-0">
                    <h3 className="text-xs font-bold text-app-text uppercase tracking-widest flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-blue-500" /> Elenco atual
                    </h3>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {elenco.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-app-text-muted text-sm italic">
                        <Users className="h-8 w-8 opacity-20 mb-2" />
                        Nenhum jogador ainda
                      </div>
                    ) : (
                      elenco.map((m) => (
                        <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-app-border last:border-b-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border",
                            m.ativo !== false ? "bg-green-500/20 text-green-500 border-green-500/20" : "bg-zinc-500/20 text-zinc-400 border-zinc-500/20"
                          )}>
                            {m.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-app-text truncate">{m.nome}</p>
                            {m.nivel_estrelas != null && (
                              <div className="flex items-center gap-0.5 text-amber-500">
                                <Star className="h-3 w-3 fill-current" />
                                <span className="text-[11px] font-semibold">{m.nivel_estrelas.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveMembro(m)}
                            disabled={removingId === m.id}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-50"
                          >
                            {removingId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Banco de jogadores */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="px-4 py-3 border-b border-app-border bg-zinc-100 dark:bg-zinc-800/50 shrink-0 space-y-2">
                    <h3 className="text-xs font-bold text-app-text uppercase tracking-widest flex items-center gap-1.5">
                      <UserPlus className="h-3.5 w-3.5 text-green-500" /> Meus jogadores
                    </h3>
                    <input
                      type="text"
                      placeholder="Buscar jogador..."
                      value={bancoBusca}
                      onChange={(e) => setBancoBusca(e.target.value)}
                      className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-1.5 text-xs text-app-text placeholder:text-app-text-muted focus:outline-none focus:ring-2 focus:ring-green-500/40"
                    />
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {bancofiltrado.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-app-text-muted text-sm italic">
                        <UserPlus className="h-8 w-8 opacity-20 mb-2" />
                        {banco.length === 0 ? "Nenhum jogador cadastrado" : "Todos já estão no elenco"}
                      </div>
                    ) : (
                      bancofiltrado.map((j) => (
                        <div key={j.id} className="flex items-center gap-3 px-4 py-3 border-b border-app-border last:border-b-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border",
                            j.ativo ? "bg-green-500/20 text-green-500 border-green-500/20" : "bg-zinc-500/20 text-zinc-400 border-zinc-500/20"
                          )}>
                            {j.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-app-text truncate">{j.nome}</p>
                            <div className="flex items-center gap-0.5 text-amber-500">
                              <Star className="h-3 w-3 fill-current" />
                              <span className="text-[11px] font-semibold">{j.nivel_estrelas.toFixed(1)}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddJogador(j)}
                            disabled={addingId === j.id}
                            className="p-1.5 text-green-500 hover:bg-green-500/10 rounded-lg transition disabled:opacity-50"
                          >
                            {addingId === j.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Teams;
