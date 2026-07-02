import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, Trophy, Users, Calendar, Settings, Plus,
  Loader2, Table as TableIcon, Play, ClipboardCheck, Award, X,
  Upload, Shield, Star, Trash2, ChevronDown, ChevronUp, UserMinus,
  Pencil, AlertTriangle, MapPin, Clock, FileText,
} from "lucide-react";
import api from "../services/api";
import toast from "react-hot-toast";

// ── Constantes ─────────────────────────────────────────────────────────────────
const MAX_TIMES: Record<string, Record<string, number>> = {
  pontos_corridos:  { pequeno: 5,  medio: 10, grande: 20 },
  grupos_mata_mata: { pequeno: 8,  medio: 16, grande: 32 },
};
const NIVEL_OPCOES = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
const CORES_RAPIDAS = ["#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#14b8a6"];

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface InscricaoTime {
  id: string; time: string; time_nome: string;
  time_cor: string; time_escudo: string;
  total_jogadores_campeonato: number; grupo: string;
}
interface JogadorElenco { id: string; nome: string; nivel_estrelas: number; }
interface BoletimGol { id: string; jogador: number; jogador_nome: string; jogador_time: string; assistencia: number | null; assistencia_nome: string | null; minuto: number | null; }
interface BoletimCartao { id: string; jogador: number; jogador_nome: string; jogador_time: string; tipo: 'amarelo' | 'vermelho'; minuto: number | null; }
interface BoletimData { jogo: any; gols: BoletimGol[]; cartoes: BoletimCartao[]; elenco_casa: JogadorElenco[]; elenco_visitante: JogadorElenco[]; }
interface Game {
  id: string;
  time_casa: string; time_visitante: string;
  time_casa_nome: string; time_visitante_nome: string;
  gols_casa: number; gols_visitante: number;
  data_hora: string | null; local: string;
  status: string; round: number | null; fase: string;
}
interface Championship {
  id: string; nome: string; descricao?: string;
  formato: string; tipo: string; status: string; modalidade: string;
  jogos_ida_volta?: boolean; data_inicio: string;
  num_grupos: number;
  classificados_por_grupo: number;
  inscricoes: InscricaoTime[];
  jogos: Game[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const toDatetimeLocal = (iso: string | null) =>
  iso ? iso.replace('Z', '').replace('+00:00', '').substring(0, 16) : '';

const fmtDatetime = (iso: string | null) => {
  if (!iso) return 'Data a definir';
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch { return iso; }
};

const Stars = ({ value }: { value: number }) => {
  const full = Math.floor(value);
  const half = value % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="text-yellow-500 text-sm">
      {'★'.repeat(full)}{half ? '½' : ''}
      <span className="opacity-30">{'★'.repeat(empty)}</span>
    </span>
  );
};
const TimeAvatar = ({ escudo, cor, nome, size = 12 }: { escudo?: string; cor?: string; nome: string; size?: number }) => {
  const s = `w-${size} h-${size}`;
  if (escudo) return <img src={escudo} alt={nome} className={`${s} rounded-xl object-cover border border-app-border shrink-0`} />;
  return (
    <div className={`${s} rounded-xl flex items-center justify-center text-white font-black text-xl shrink-0`}
      style={{ backgroundColor: cor || '#3b82f6' }}>
      {nome.charAt(0).toUpperCase()}
    </div>
  );
};

// ── Componente principal ───────────────────────────────────────────────────────
const ChampionshipDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [champ, setChamp]         = useState<Championship | null>(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<'tabela'|'jogos'|'times'|'artilharia'|'cartoes'>('tabela');
  const [standings, setStandings] = useState<any[]>([]);
  const [standingsGrupos, setStandingsGrupos] = useState<Record<string, any[]>>({});
  const [scorers,   setScorers]   = useState<any[]>([]);
  const [cards,     setCards]     = useState<any[]>([]);

  // ── modal inscrição ──
  const [showInscModal,  setShowInscModal]  = useState(false);
  const [inscTab,        setInscTab]        = useState<'selecionar'|'criar'>('selecionar');
  const [availableTeams, setAvailableTeams] = useState<{id:string;nome:string;total_jogadores:number}[]>([]);
  const [selectedTimeId, setSelectedTimeId] = useState('');
  const [newTime,        setNewTime]        = useState({ nome:'', escudo:'', cor:'#3b82f6' });
  const [newTimeErrors,  setNewTimeErrors]  = useState<Record<string,string>>({});
  const [savingInsc,     setSavingInsc]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── gestão de elenco ──
  const [elencos,       setElencos]       = useState<Record<string,JogadorElenco[]>>({});
  const [expandedTime,  setExpandedTime]  = useState<string|null>(null);
  const [loadingElenco, setLoadingElenco] = useState<Record<string,boolean>>({});
  const [showAddJog,    setShowAddJog]    = useState(false);
  const [addJogInscId,  setAddJogInscId]  = useState('');
  const [jogForm,       setJogForm]       = useState({ nome:'', nivel_estrelas: 1.0 });
  const [jogErrors,     setJogErrors]     = useState<Record<string,string>>({});
  const [savingJog,     setSavingJog]     = useState(false);

  // ── edição de jogo (RF56) ──
  const [showEditJogo, setShowEditJogo] = useState(false);
  const [editJogo,     setEditJogo]     = useState<Game|null>(null);
  const [editForm,     setEditForm]     = useState({ data: '', local: '' });
  const [savingJogo,   setSavingJogo]   = useState(false);
  const [conflito,     setConflito]     = useState<{mensagem:string; sugestoes:string[]}|null>(null);

  // ── edição inline de placar ──
  const [inlinePlacar, setInlinePlacar] = useState<{ gameId: string; casa: string; fora: string } | null>(null);
  const [savingInline,  setSavingInline]  = useState(false);

  // ── status do campeonato ──
  const [savingStatus, setSavingStatus] = useState(false);

  // ── geração de grupos / mata-mata ──
  const [gerando,     setGerando]     = useState(false);
  const [iniciandoMM, setIniciandoMM] = useState(false);

  // ── boletim (RF57–RF60) ──
  const [showBoletim,    setShowBoletim]    = useState(false);
  const [boletimGame,    setBoletimGame]    = useState<Game|null>(null);
  const [boletimData,    setBoletimData]    = useState<BoletimData|null>(null);
  const [loadingBoletim, setLoadingBoletim] = useState(false);
  const [golForm,        setGolForm]        = useState({ time: 'casa', jogador: '', assistencia: '', minuto: '' });
  const [cartaoForm,     setCartaoForm]     = useState({ time: 'casa', jogador: '', tipo: 'amarelo', minuto: '' });
  const [savingGol,      setSavingGol]      = useState(false);
  const [savingCartao,   setSavingCartao]   = useState(false);
  const [finalizando,    setFinalizando]    = useState(false);
  const [placarForm,     setPlacarForm]     = useState({ casa: '', fora: '' });
  const [savingPlacar,   setSavingPlacar]   = useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────────

  const fetchChamp = async (): Promise<Championship|null> => {
    try {
      const [champR, inscR, gamesR] = await Promise.all([
        api.get(`/campeonatos/${id}/`),
        api.get(`/inscricoes/?campeonato=${id}`),
        api.get(`/campeonatos/${id}/partidas/`),
      ]);
      const inscricoes: InscricaoTime[] = inscR.data.map((t: any) => ({
        id:   String(t.id),
        time: String(t.time),
        time_nome:   t.time_nome,
        time_cor:    t.time_cor  || '',
        time_escudo: t.time_escudo || '',
        total_jogadores_campeonato: t.total_jogadores_campeonato ?? 0,
        grupo: t.grupo || '',
      }));
      const jogos: Game[] = gamesR.data.map((g: any) => ({
        id:    String(g.id),
        time_casa:      String(g.time_casa_id),
        time_visitante: String(g.time_visitante_id),
        time_casa_nome:       g.time_casa_nome,
        time_visitante_nome:  g.time_fora_nome,
        gols_casa:      g.gols_casa  ?? 0,
        gols_visitante: g.gols_fora  ?? 0,
        data_hora:      g.data  || null,
        local:          g.local || '',
        status:  g.status === 'realizada' ? 'realizado' : 'agendado',
        round:   g.rodada ?? null,
        fase:    g.fase   || 'grupos',
      }));
      const loaded: Championship = {
        ...champR.data,
        id: String(champR.data.id),
        num_grupos: champR.data.num_grupos || 2,
        classificados_por_grupo: champR.data.classificados_por_grupo || 2,
        inscricoes,
        jogos,
      };
      setChamp(loaded);
      if (loaded.formato === 'grupos_mata_mata') {
        setActiveTab(t => t === 'tabela' ? 'jogos' : t);
      }
      return loaded;
    } catch {
      toast.error('Campeonato não encontrado.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchStandings = async () => {
    try {
      const r = await api.get(`/campeonatos/${id}/classificacao/`);
      const mapRow = (x: any) => ({ nome: x.time, pts: x.P, pj: x.J, v: x.V, e: x.E, d: x.D, gp: x.GM, gc: x.GC, sg: x.SG });
      if (Array.isArray(r.data)) {
        setStandings(r.data.map(mapRow));
        setStandingsGrupos({});
      } else {
        // grupos_mata_mata: { "A": [...], "B": [...] }
        const grupos: Record<string, any[]> = {};
        for (const [letra, rows] of Object.entries(r.data as Record<string, any[]>)) {
          grupos[letra] = rows.map(mapRow);
        }
        setStandingsGrupos(grupos);
        setStandings([]);
      }
    } catch { setStandings([]); setStandingsGrupos({}); }
  };
  const fetchScorers = async () => {
    try { const r = await api.get(`/campeonatos/${id}/artilharia/`); setScorers(Array.isArray(r.data) ? r.data : []); }
    catch { setScorers([]); }
  };
  const fetchCards = async () => {
    try { const r = await api.get(`/campeonatos/${id}/cartoes/`); setCards(Array.isArray(r.data) ? r.data : []); }
    catch { setCards([]); }
  };
  const fetchElenco = async (inscricaoId: string, timeId: string) => {
    setLoadingElenco(p => ({ ...p, [inscricaoId]: true }));
    try {
      const r = await api.get(`/times/${timeId}/elenco/`);
      setElencos(p => ({ ...p, [inscricaoId]: r.data }));
    } catch { setElencos(p => ({ ...p, [inscricaoId]: [] })); }
    finally { setLoadingElenco(p => ({ ...p, [inscricaoId]: false })); }
  };

  useEffect(() => { fetchChamp(); fetchStandings(); }, [id]);
  useEffect(() => {
    if (activeTab === 'artilharia') fetchScorers();
    if (activeTab === 'cartoes')    fetchCards();
    if (activeTab === 'tabela')     fetchStandings();
  }, [activeTab]);

  // ── excluir campeonato ─────────────────────────────────────────────────────────

  const handleDeleteChamp = async () => {
    if (!champ) return;
    if (!window.confirm(`Excluir "${champ.nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/campeonatos/${id}/`);
      toast.success('Campeonato excluído.');
      navigate('/championships');
    } catch { toast.error('Erro ao excluir. Verifique se você é o organizador.'); }
  };

  // ── desinscrecer time ──────────────────────────────────────────────────────────

  const handleRemoveInscricao = async (insc: InscricaoTime) => {
    if (!window.confirm(`Remover "${insc.time_nome}" do campeonato?`)) return;
    try {
      await api.delete(`/inscricoes/${insc.id}/`);
      toast.success(`${insc.time_nome} removido.`);
      setChamp(prev => prev ? { ...prev, inscricoes: prev.inscricoes.filter(i => i.id !== insc.id) } : prev);
      if (expandedTime === insc.id) setExpandedTime(null);
    } catch { toast.error('Erro ao remover time.'); }
  };

  // ── edição de jogo (RF56) ─────────────────────────────────────────────────────

  const openEditJogo = (game: Game) => {
    setEditJogo(game);
    setEditForm({ data: toDatetimeLocal(game.data_hora), local: game.local });
    setConflito(null);
    setShowEditJogo(true);
  };

  const handleSaveJogo = async () => {
    if (!editJogo) return;
    setSavingJogo(true);
    setConflito(null);
    try {
      const payload: Record<string, string> = {};
      if (editForm.data) payload.data = editForm.data.length === 16 ? editForm.data + ':00' : editForm.data;
      payload.local = editForm.local;
      await api.patch(`/partidas/${editJogo.id}/`, payload);
      toast.success('Jogo atualizado!');
      setShowEditJogo(false);
      fetchChamp();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setConflito(err.response.data);
      } else {
        toast.error('Erro ao atualizar jogo.');
      }
    } finally { setSavingJogo(false); }
  };

  // ── geração e grupos (RF54.1) ─────────────────────────────────────────────────

  const handleGerarJogosGrupo = async () => {
    setGerando(true);
    try {
      await api.post(`/campeonatos/${id}/gerar-partidas/`);
      toast.success('Jogos de grupo gerados!');
      fetchChamp();
    } catch (err: any) {
      toast.error(err.response?.data?.erro || 'Erro ao gerar jogos.');
    } finally { setGerando(false); }
  };

  const handleEditarGrupo = async (inscId: string, novoGrupo: string) => {
    try {
      await api.patch(`/inscricoes/${inscId}/`, { grupo: novoGrupo });
      setChamp(prev => prev ? {
        ...prev,
        inscricoes: prev.inscricoes.map(i => i.id === inscId ? { ...i, grupo: novoGrupo } : i),
      } : prev);
    } catch { toast.error('Erro ao atualizar grupo.'); }
  };

  const handleSalvarInlinePlacar = async () => {
    if (!inlinePlacar) return;
    setSavingInline(true);
    try {
      await api.patch(`/partidas/${inlinePlacar.gameId}/`, {
        gols_casa: Number(inlinePlacar.casa),
        gols_fora: Number(inlinePlacar.fora),
      });
      setChamp(prev => prev ? {
        ...prev,
        jogos: prev.jogos.map(g =>
          g.id === inlinePlacar.gameId
            ? { ...g, gols_casa: Number(inlinePlacar.casa), gols_visitante: Number(inlinePlacar.fora) }
            : g
        ),
      } : prev);
      toast.success('Placar salvo!');
      setInlinePlacar(null);
    } catch { toast.error('Erro ao salvar placar.'); }
    finally { setSavingInline(false); }
  };

  // ── inscrição ─────────────────────────────────────────────────────────────────

  const openInscModal = async () => {
    try {
      const r = await api.get('/times/');
      const inscritos = new Set(champ?.inscricoes.map(i => i.time));
      setAvailableTeams(
        r.data
          .filter((t: any) => !inscritos.has(String(t.id)))
          .map((t: any) => ({ id: String(t.id), nome: t.nome, total_jogadores: t.total_jogadores ?? 0 }))
      );
    } catch { setAvailableTeams([]); }
    setSelectedTimeId('');
    setNewTimeErrors({}); setInscTab('selecionar'); setShowInscModal(true);
  };

  const handleEscudoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Máximo 2 MB.'); return; }
    const reader = new FileReader();
    reader.onload = ev => setNewTime(p => ({ ...p, escudo: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const inscreverTime = async (timeId: string) => {
    const antes = champ?.jogos.length ?? 0;
    await api.post('/inscricoes/', { time: timeId, campeonato: id });
    setShowInscModal(false);
    const updated = await fetchChamp();
    if (updated && updated.jogos.length > antes) {
      toast.success('Campeonato completo! Tabela gerada.');
    } else {
      const max  = MAX_TIMES[updated?.formato ?? '']?.[updated?.tipo ?? ''] ?? 0;
      const vaga = max - (updated?.inscricoes.length ?? 0);
      toast.success(vaga > 0 ? `Time inscrito! ${vaga} vaga${vaga !== 1 ? 's' : ''} restante${vaga !== 1 ? 's' : ''}.` : 'Time inscrito!');
    }
  };

  const handleInscSelecionado = async () => {
    if (!selectedTimeId) return;
    setSavingInsc(true);
    try { await inscreverTime(selectedTimeId); }
    catch (err: any) {
      const detail = err.response?.data;
      toast.error(detail ? Object.values(detail).flat().join(' ') : 'Erro ao inscrever time.');
    } finally { setSavingInsc(false); }
  };

  const handleCriarEInscrever = async () => {
    const errs: Record<string,string> = {};
    if (!newTime.nome.trim()) errs.nome = 'Nome é obrigatório.';
    setNewTimeErrors(errs);
    if (Object.keys(errs).length) return;
    setSavingInsc(true);
    try {
      const r = await api.post('/times/', { nome: newTime.nome.trim(), escudo: newTime.escudo, cor: newTime.cor });
      await inscreverTime(String(r.data.id));
    } catch (err: any) {
      const detail = err.response?.data;
      if (detail && typeof detail === 'object') {
        const apiErrs: Record<string,string> = {};
        for (const [k,v] of Object.entries(detail)) apiErrs[k] = Array.isArray(v) ? (v as string[]).join(' ') : String(v);
        setNewTimeErrors(apiErrs);
      } else { toast.error('Erro ao criar time.'); }
    } finally { setSavingInsc(false); }
  };

  // ── editar status do campeonato ──────────────────────────────────────────────

  const handleChangeStatus = async (novoStatus: string) => {
    if (!champ || novoStatus === champ.status) return;
    setSavingStatus(true);
    try {
      await api.patch(`/campeonatos/${id}/`, { status: novoStatus });
      setChamp(prev => prev ? { ...prev, status: novoStatus } : prev);
      toast.success('Status atualizado!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao atualizar status.');
    } finally { setSavingStatus(false); }
  };

  // ── iniciar mata-mata ────────────────────────────────────────────────────────

  const handleIniciarMataMata = async () => {
    if (!window.confirm('Iniciar a fase mata-mata? Os jogos serão gerados com base na classificação dos grupos.')) return;
    setIniciandoMM(true);
    try {
      await api.post(`/campeonatos/${id}/gerar-mata-mata/`);
      toast.success('Fase mata-mata iniciada! Jogos gerados.');
      await fetchChamp();
      await fetchStandings();
    } catch (err: any) {
      toast.error(err.response?.data?.erro || 'Erro ao iniciar mata-mata.');
    } finally { setIniciandoMM(false); }
  };

  // ── elenco ────────────────────────────────────────────────────────────────────

  const toggleExpand = (inscId: string, timeId: string) => {
    if (expandedTime === inscId) { setExpandedTime(null); }
    else { setExpandedTime(inscId); if (!elencos[inscId]) fetchElenco(inscId, timeId); }
  };

  const openAddJog = (inscId: string) => {
    setAddJogInscId(inscId); setJogForm({ nome:'', nivel_estrelas: 1.0 }); setJogErrors({}); setShowAddJog(true);
  };

  const handleAddJog = async () => {
    if (!jogForm.nome.trim()) { setJogErrors({ nome: 'Nome é obrigatório.' }); return; }
    const insc = champ?.inscricoes.find(i => i.id === addJogInscId);
    if (!insc) return;
    setSavingJog(true);
    try {
      // Cria jogador no time via JogadorDoTime (nome livre, sem FK a Jogador)
      await api.post(`/inscricoes/${addJogInscId}/jogadores/`, { nome: jogForm.nome.trim(), nivel_estrelas: jogForm.nivel_estrelas });
      // Refaz o elenco a partir do time geral + novo JogadorTimeCampeonato
      await fetchElenco(addJogInscId, insc.time);
      toast.success('Jogador adicionado!');
      setShowAddJog(false);
    } catch (err: any) {
      const detail = err.response?.data;
      if (detail?.nome) setJogErrors({ nome: Array.isArray(detail.nome) ? detail.nome.join(' ') : detail.nome });
      else toast.error('Erro ao adicionar jogador.');
    } finally { setSavingJog(false); }
  };

  const handleRemoveJog = async (inscId: string, jogId: string, timeId?: string) => {
    if (!window.confirm('Remover jogador do elenco do time?')) return;
    try {
      await api.delete(`/elenco/${jogId}/`);
      setElencos(p => ({ ...p, [inscId]: p[inscId].filter(j => j.id !== jogId) }));
      setChamp(prev => prev ? {
        ...prev,
        inscricoes: prev.inscricoes.map(i =>
          i.id === inscId ? { ...i, total_jogadores_campeonato: Math.max(0, i.total_jogadores_campeonato - 1) } : i
        ),
      } : prev);
    } catch { toast.error('Erro ao remover jogador.'); }
  };

  // ── boletim (RF57–RF60) ───────────────────────────────────────────────────────

  const openBoletim = async (game: Game) => {
    setBoletimGame(game);
    setBoletimData(null);
    setPlacarForm({ casa: String(game.gols_casa ?? 0), fora: String(game.gols_visitante ?? 0) });
    setLoadingBoletim(true);
    setShowBoletim(true);
    setGolForm({ time: 'casa', jogador: '', assistencia: '', minuto: '' });
    setCartaoForm({ time: 'casa', jogador: '', tipo: 'amarelo', minuto: '' });
    try {
      const r = await api.get(`/partidas/${game.id}/boletim/`);
      setBoletimData(r.data);
    } catch { toast.error('Erro ao carregar boletim.'); }
    finally { setLoadingBoletim(false); }
  };

  const refreshBoletim = async (gameId: string) => {
    const r = await api.get(`/partidas/${gameId}/boletim/`);
    setBoletimData(r.data);
    const j = r.data.jogo;
    setPlacarForm({ casa: String(j.gols_casa ?? 0), fora: String(j.gols_fora ?? 0) });
    fetchChamp();
  };

  const handleSalvarPlacar = async () => {
    if (!boletimGame) return;
    setSavingPlacar(true);
    try {
      await api.patch(`/partidas/${boletimGame.id}/`, {
        gols_casa: Number(placarForm.casa),
        gols_fora: Number(placarForm.fora),
      });
      toast.success('Placar salvo!');
      await refreshBoletim(boletimGame.id);
    } catch { toast.error('Erro ao salvar placar.'); }
    finally { setSavingPlacar(false); }
  };

  const handleAddGol = async () => {
    if (!boletimGame || !golForm.jogador) return;
    setSavingGol(true);
    try {
      const payload: Record<string, any> = { jogador: golForm.jogador };
      if (golForm.assistencia) payload.assistencia = golForm.assistencia;
      if (golForm.minuto) payload.minuto = Number(golForm.minuto);
      await api.post(`/partidas/${boletimGame.id}/gols/`, payload);
      setGolForm(p => ({ ...p, jogador: '', assistencia: '', minuto: '' }));
      await refreshBoletim(boletimGame.id);
    } catch (err: any) { toast.error(err.response?.data?.jogador?.[0] || err.response?.data?.detail || 'Erro ao registrar gol.'); }
    finally { setSavingGol(false); }
  };

  const handleDeleteGol = async (golId: string) => {
    if (!boletimGame) return;
    try {
      await api.delete(`/gols/${golId}/`);
      await refreshBoletim(boletimGame.id);
    } catch { toast.error('Erro ao remover gol.'); }
  };

  const handleAddCartao = async () => {
    if (!boletimGame || !cartaoForm.jogador) return;
    setSavingCartao(true);
    try {
      const payload: Record<string, any> = { jogador: cartaoForm.jogador, tipo: cartaoForm.tipo };
      if (cartaoForm.minuto) payload.minuto = Number(cartaoForm.minuto);
      await api.post(`/partidas/${boletimGame.id}/cartoes/`, payload);
      setCartaoForm(p => ({ ...p, jogador: '', minuto: '' }));
      await refreshBoletim(boletimGame.id);
    } catch (err: any) { toast.error(err.response?.data?.jogador?.[0] || err.response?.data?.detail || 'Erro ao registrar cartão.'); }
    finally { setSavingCartao(false); }
  };

  const handleDeleteCartao = async (cartaoId: string) => {
    if (!boletimGame) return;
    try {
      await api.delete(`/cartoes/${cartaoId}/`);
      await refreshBoletim(boletimGame.id);
    } catch { toast.error('Erro ao remover cartão.'); }
  };

  const handleFinalizarJogo = async () => {
    if (!boletimGame) return;
    setFinalizando(true);
    try {
      const r = await api.post(`/partidas/${boletimGame.id}/finalizar/`);
      toast.success('Jogo finalizado!');
      setBoletimGame(prev => prev ? { ...prev, status: 'realizado' } : prev);
      setBoletimData(prev => prev ? { ...prev, jogo: r.data } : prev);
      fetchChamp();
      fetchStandings();
      if (activeTab === 'artilharia') fetchScorers();
      if (activeTab === 'cartoes')    fetchCards();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Erro ao finalizar jogo.'); }
    finally { setFinalizando(false); }
  };

  // ── render guards ─────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12 min-h-screen space-y-4">
      <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
      <span className="text-app-text-muted">Carregando campeonato...</span>
    </div>
  );
  if (!champ) return (
    <div className="p-12 text-center min-h-screen space-y-4">
      <p className="text-app-text-muted text-xl italic font-bold">Campeonato não encontrado.</p>
      <button onClick={() => navigate('/championships')} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition">Voltar</button>
    </div>
  );

  const maxTimes  = MAX_TIMES[champ.formato]?.[champ.tipo] ?? 0;
  const vagas     = maxTimes - champ.inscricoes.length;
  const isFull    = vagas <= 0 || champ.status === 'encerrado';
  const gruposLetras = Array.from({ length: champ.num_grupos }, (_, i) => String.fromCharCode(65 + i));
  // grupos_mata_mata: grupos distribuídos mas jogos ainda não gerados
  const aguardandoGeracao = champ.formato === 'grupos_mata_mata' && isFull && champ.jogos.length === 0;

  // grupos_mata_mata: todos os jogos de grupos realizados e nenhum jogo de MM existe ainda
  const jogosGrupos = champ.jogos.filter(g => g.fase === 'grupos');
  const jogosMM     = champ.jogos.filter(g => g.fase !== 'grupos');
  const prontoParaMM = champ.formato === 'grupos_mata_mata'
    && jogosGrupos.length > 0
    && jogosGrupos.every(g => g.status === 'realizado')
    && jogosMM.length === 0;

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-20">
      <button onClick={() => navigate('/championships')}
        className="flex items-center text-app-text-muted hover:text-green-500 transition font-bold">
        <ChevronLeft className="w-4 h-4 mr-1" /> Voltar para Campeonatos
      </button>

      {/* Header */}
      <div className="bg-app-card rounded-3xl border border-app-border p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-5"><Trophy className="w-40 h-40 text-app-text" /></div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <h1 className="text-3xl font-black text-app-text uppercase tracking-tighter">{champ.nome}</h1>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {!isFull && (
                <button onClick={openInscModal}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition active:scale-95 whitespace-nowrap">
                  <Plus className="w-4 h-4" /> Inscrever Time
                  <span className="bg-green-500/30 border border-green-400/30 px-2 py-0.5 rounded-full text-[10px]">
                    {vagas} vaga{vagas !== 1 ? 's' : ''}
                  </span>
                </button>
              )}
              <button onClick={() => window.open(`/c/${id}`, '_blank')}
                className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-app-border text-app-text-muted hover:text-app-text px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition active:scale-95 whitespace-nowrap">
                <FileText className="w-4 h-4" /> Página Pública
              </button>
              <button onClick={handleDeleteChamp}
                className="flex items-center gap-2 bg-red-600/10 hover:bg-red-600 border border-red-600/30 hover:border-red-600 text-red-500 hover:text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition active:scale-95 whitespace-nowrap">
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-3">
            <span className="text-[10px] text-app-text-muted font-black uppercase tracking-widest flex items-center bg-zinc-100 dark:bg-zinc-800/50 border border-app-border px-3 py-1.5 rounded-full">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />
              {champ.data_inicio ? new Date(champ.data_inicio + 'T00:00:00').toLocaleDateString() : 'Data não definida'}
            </span>
            <span className="text-[10px] text-app-text-muted font-black uppercase tracking-widest flex items-center bg-zinc-100 dark:bg-zinc-800/50 border border-app-border px-3 py-1.5 rounded-full">
              <Settings className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />
              {champ.formato?.replace(/_/g, ' ')}
            </span>
            <span className={`text-[10px] font-black uppercase tracking-widest flex items-center px-3 py-1.5 rounded-full border ${
              isFull ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-zinc-100 dark:bg-zinc-800/50 border-app-border text-app-text-muted'
            }`}>
              <Users className="w-3.5 h-3.5 mr-1.5" />
              {champ.inscricoes.length} / {maxTimes || '?'} times
            </span>

            {/* Status selector */}
            <label className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest cursor-pointer transition ${
              champ.status === 'ativo'      ? 'bg-green-500/10 border-green-500/30 text-green-500' :
              champ.status === 'encerrado'  ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                                              'bg-zinc-100 dark:bg-zinc-800/50 border-app-border text-app-text-muted'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                champ.status === 'ativo'     ? 'bg-green-500' :
                champ.status === 'encerrado' ? 'bg-red-400' : 'bg-zinc-400'
              }`} />
              {savingStatus ? 'Salvando…' : champ.status}
              <select
                value={champ.status}
                disabled={savingStatus}
                onChange={e => handleChangeStatus(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
              >
                <option value="rascunho">Rascunho</option>
                <option value="ativo">Ativo</option>
                <option value="encerrado">Encerrado</option>
              </select>
            </label>
          </div>

          {/* Tabs */}
          <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
            {([
              { id: 'tabela',     icon: TableIcon,     label: 'Classificação', hidden: champ.formato === 'grupos_mata_mata' },
              { id: 'jogos',      icon: Play,           label: 'Jogos' },
              { id: 'artilharia', icon: Award,          label: 'Artilharia' },
              { id: 'cartoes',    icon: ClipboardCheck, label: 'Cartões' },
              { id: 'times',      icon: Users,          label: 'Times' },
            ] as const).filter(tab => !('hidden' in tab && tab.hidden)).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-app-text-muted border border-app-border hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}>
                <tab.icon className="w-3.5 h-3.5 mr-2" />{tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="bg-app-card rounded-3xl border border-app-border p-8 shadow-sm mt-4">

          {/* ── Classificação ── */}
          {activeTab === 'tabela' && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-app-text uppercase tracking-tight">Classificação Atual</h2>
              <div className="overflow-x-auto rounded-2xl border border-app-border bg-app-bg/20">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-100 dark:bg-zinc-800/50 text-app-text-muted text-[10px] font-black uppercase tracking-widest">
                    <tr>{['POS','TIME','PTS','PJ','V','E','D','GP','GC','SG'].map(h => (
                      <th key={h} className={`px-4 py-5 ${h === 'TIME' ? 'text-left' : 'text-center'}`}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {(standings.length > 0 ? standings : champ.inscricoes.map(i => ({ nome: i.time_nome }))).map((team: any, idx: number) => (
                      <tr key={idx} className="hover:bg-app-bg/30 transition-colors group">
                        <td className="px-4 py-5 font-black text-app-text-muted">{idx + 1}º</td>
                        <td className="px-4 py-5 font-black text-app-text group-hover:text-blue-500 transition-colors uppercase tracking-tight">{team.nome || team.time}</td>
                        <td className="px-4 py-5 text-center font-black text-blue-500 text-lg">{team.pts ?? 0}</td>
                        <td className="px-4 py-5 text-center font-bold text-app-text-muted">{team.pj ?? 0}</td>
                        <td className="px-4 py-5 text-center font-bold text-green-500">{team.v ?? 0}</td>
                        <td className="px-4 py-5 text-center font-bold text-app-text-muted">{team.e ?? 0}</td>
                        <td className="px-4 py-5 text-center font-bold text-red-500">{team.d ?? 0}</td>
                        <td className="px-4 py-5 text-center font-bold text-app-text-muted">{team.gp ?? 0}</td>
                        <td className="px-4 py-5 text-center font-bold text-app-text-muted">{team.gc ?? 0}</td>
                        <td className={`px-4 py-5 text-center font-black ${(team.sg??0) > 0 ? 'text-green-500' : (team.sg??0) < 0 ? 'text-red-500' : 'text-app-text-muted'}`}>{team.sg ?? 0}</td>
                      </tr>
                    ))}
                    {champ.inscricoes.length === 0 && (
                      <tr><td colSpan={10} className="px-4 py-12 text-center text-app-text-muted italic text-xs">Nenhum time inscrito ainda.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Jogos ── */}
          {activeTab === 'jogos' && (() => {
            if (champ.jogos.length === 0) return (
              <div className="space-y-4">
                <h2 className="text-xl font-black text-app-text uppercase tracking-tight">Calendário e Resultados</h2>
                <div className="text-center py-20 text-app-text-muted bg-app-bg/30 rounded-3xl border-2 border-dashed border-app-border">
                  {aguardandoGeracao ? (
                    <div className="space-y-4">
                      <p className="text-sm font-black uppercase tracking-widest">Grupos distribuídos — pronto para gerar jogos</p>
                      <p className="text-xs text-app-text-muted">Ajuste os grupos na aba <strong>Times</strong> se necessário, depois gere os jogos.</p>
                      <button onClick={() => setActiveTab('times')}
                        className="mx-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition">
                        <Users className="w-4 h-4" /> Ver Grupos
                      </button>
                    </div>
                  ) : isFull ? (
                    <p className="text-xs font-black uppercase tracking-widest italic">Aguardando geração automática da tabela…</p>
                  ) : (
                    <p className="text-xs font-black uppercase tracking-widest italic">
                      Aguardando inscrição de todos os times ({vagas} vaga{vagas !== 1 ? 's' : ''} restante{vagas !== 1 ? 's' : ''}).
                    </p>
                  )}
                </div>
              </div>
            );

            const rodadas = champ.jogos.reduce<Record<string, Game[]>>((acc, g) => {
              const key = `${g.fase}__${g.round ?? 0}`;
              if (!acc[key]) acc[key] = [];
              acc[key].push(g);
              return acc;
            }, {});

            return (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h2 className="text-xl font-black text-app-text uppercase tracking-tight">Calendário e Resultados</h2>
                  <p className="text-xs text-app-text-muted">
                    {champ.jogos.filter(g => g.status === 'realizado').length} de {champ.jogos.length} jogos realizados
                  </p>
                </div>

                {/* Tabelas dos grupos (formato grupos_mata_mata) */}
                {champ.formato === 'grupos_mata_mata' && Object.keys(standingsGrupos).length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-app-text-muted uppercase tracking-[0.2em] italic px-1 flex items-center gap-2">
                      <span className="h-px flex-1 bg-app-border" />
                      <TableIcon className="w-3.5 h-3.5" /> Classificação por Grupo
                      <span className="h-px flex-1 bg-app-border" />
                    </h3>
                    <div className={`grid gap-4 ${Object.keys(standingsGrupos).length > 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                      {Object.entries(standingsGrupos).sort(([a], [b]) => a.localeCompare(b)).map(([letra, tabela]) => (
                        <div key={letra} className="bg-app-bg/30 border border-app-border rounded-2xl overflow-hidden shadow-sm">
                          <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800/60 border-b border-app-border">
                            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xs">
                              {letra}
                            </div>
                            <span className="text-xs font-black text-app-text uppercase tracking-widest">Grupo {letra}</span>
                          </div>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-app-text-muted border-b border-app-border">
                                <th className="text-left px-3 py-2 font-bold">#</th>
                                <th className="text-left px-3 py-2 font-bold">Time</th>
                                <th className="px-2 py-2 font-bold text-center">P</th>
                                <th className="px-2 py-2 font-bold text-center">J</th>
                                <th className="px-2 py-2 font-bold text-center">V</th>
                                <th className="px-2 py-2 font-bold text-center">E</th>
                                <th className="px-2 py-2 font-bold text-center">D</th>
                                <th className="px-2 py-2 font-bold text-center">SG</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tabela.map((row, i) => {
                                const classificado = i < champ.classificados_por_grupo;
                                return (
                                  <tr key={i} className={`border-b border-app-border last:border-b-0 ${classificado ? 'bg-green-500/5' : ''}`}>
                                    <td className="px-3 py-2.5 text-app-text-muted font-bold">{i + 1}</td>
                                    <td className="px-3 py-2.5 font-bold text-app-text flex items-center gap-2">
                                      {classificado && <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />}
                                      {row.nome}
                                    </td>
                                    <td className="px-2 py-2.5 text-center font-black text-app-text">{row.pts}</td>
                                    <td className="px-2 py-2.5 text-center text-app-text-muted">{row.pj}</td>
                                    <td className="px-2 py-2.5 text-center text-app-text-muted">{row.v}</td>
                                    <td className="px-2 py-2.5 text-center text-app-text-muted">{row.e}</td>
                                    <td className="px-2 py-2.5 text-center text-app-text-muted">{row.d}</td>
                                    <td className={`px-2 py-2.5 text-center font-bold ${row.sg > 0 ? 'text-green-500' : row.sg < 0 ? 'text-red-400' : 'text-app-text-muted'}`}>{row.sg > 0 ? `+${row.sg}` : row.sg}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botão iniciar mata-mata */}
                {prontoParaMM && (
                  <div className="flex justify-center py-4">
                    <button
                      onClick={handleIniciarMataMata}
                      disabled={iniciandoMM}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition shadow-lg shadow-green-600/30"
                    >
                      <Play className="w-4 h-4" />
                      {iniciandoMM ? 'Gerando…' : 'Iniciar Fase Mata-Mata'}
                    </button>
                  </div>
                )}

                {Object.entries(rodadas)
                  .sort(([a], [b]) => {
                    const [fa, ra] = a.split('__');
                    const [fb, rb] = b.split('__');
                    const faseOrder: Record<string,number> = { grupos: 0, oitavas: 1, quartas: 2, semi: 3, final: 4 };
                    return (faseOrder[fa] ?? 0) - (faseOrder[fb] ?? 0) || Number(ra) - Number(rb);
                  })
                  .map(([key, jogos]) => {
                    const [fase, rodadaStr] = key.split('__');
                    const rodada = Number(rodadaStr);
                    const label = fase !== 'grupos'
                      ? fase.charAt(0).toUpperCase() + fase.slice(1)
                      : `Rodada ${rodada || '—'}`;
                    return (
                      <div key={key} className="space-y-3">
                        <h3 className="text-xs font-black text-app-text-muted uppercase tracking-[0.2em] italic px-1 flex items-center gap-2">
                          <span className="h-px flex-1 bg-app-border" />{label}<span className="h-px flex-1 bg-app-border" />
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          {jogos.map(game => (
                            <div key={game.id} className="bg-app-bg/30 border border-app-border rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm group relative">
                              {/* Botões de ação */}
                              <div className="absolute top-3 right-3 flex items-center gap-1">
                                <button onClick={() => openEditJogo(game)}
                                  className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition" title="Editar data/hora/local">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => openBoletim(game)}
                                  className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg transition" title="Abrir boletim">
                                  <FileText className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="flex-1 text-center md:text-right font-black text-app-text text-lg uppercase tracking-tight">{game.time_casa_nome}</div>
                              <div className="flex flex-col items-center gap-2">
                                {/* Placar — clique para editar inline */}
                                {inlinePlacar?.gameId === game.id ? (
                                  <div className="flex items-center gap-2 bg-app-bg/50 p-2 rounded-[2rem] border-2 border-blue-500/50 shadow-inner">
                                    <input
                                      autoFocus
                                      type="number" min="0" max="99"
                                      value={inlinePlacar.casa}
                                      onChange={e => setInlinePlacar(p => p ? { ...p, casa: e.target.value } : p)}
                                      onKeyDown={e => { if (e.key === 'Enter') handleSalvarInlinePlacar(); if (e.key === 'Escape') setInlinePlacar(null); }}
                                      className="w-14 h-14 text-3xl font-black text-center bg-app-bg border-2 border-blue-500/40 rounded-2xl text-app-text focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <span className="text-app-text-muted font-black text-xl select-none">×</span>
                                    <input
                                      type="number" min="0" max="99"
                                      value={inlinePlacar.fora}
                                      onChange={e => setInlinePlacar(p => p ? { ...p, fora: e.target.value } : p)}
                                      onKeyDown={e => { if (e.key === 'Enter') handleSalvarInlinePlacar(); if (e.key === 'Escape') setInlinePlacar(null); }}
                                      className="w-14 h-14 text-3xl font-black text-center bg-app-bg border-2 border-blue-500/40 rounded-2xl text-app-text focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <div className="flex flex-col gap-1 ml-1">
                                      <button onClick={handleSalvarInlinePlacar} disabled={savingInline}
                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black rounded-lg transition disabled:opacity-50">
                                        {savingInline ? '…' : 'OK'}
                                      </button>
                                      <button onClick={() => setInlinePlacar(null)}
                                        className="px-3 py-1 border border-app-border text-app-text-muted text-[10px] font-black rounded-lg hover:bg-app-bg transition">
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setInlinePlacar({ gameId: game.id, casa: String(game.gols_casa), fora: String(game.gols_visitante) })}
                                    className="flex items-center gap-4 bg-app-bg/50 p-3 rounded-[2rem] border border-app-border shadow-inner hover:border-blue-500/50 transition group/placar"
                                    title="Clique para editar placar"
                                  >
                                    <span className={`text-4xl font-black w-14 h-14 flex items-center justify-center rounded-2xl transition ${game.status === 'realizado' ? 'bg-white dark:bg-zinc-800 text-app-text shadow-lg' : 'bg-app-bg text-app-text-muted group-hover/placar:bg-blue-500/10 group-hover/placar:text-blue-500'}`}>{game.gols_casa}</span>
                                    <span className="text-app-text-muted font-black text-xl italic select-none">VS</span>
                                    <span className={`text-4xl font-black w-14 h-14 flex items-center justify-center rounded-2xl transition ${game.status === 'realizado' ? 'bg-white dark:bg-zinc-800 text-app-text shadow-lg' : 'bg-app-bg text-app-text-muted group-hover/placar:bg-blue-500/10 group-hover/placar:text-blue-500'}`}>{game.gols_visitante}</span>
                                  </button>
                                )}
                                <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-black text-app-text-muted uppercase tracking-widest">
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDatetime(game.data_hora)}</span>
                                  {game.local && <><span className="w-1 h-1 bg-app-border rounded-full" /><span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{game.local}</span></>}
                                  <span className="w-1 h-1 bg-app-border rounded-full" />
                                  <span className={game.status === 'realizado' ? 'text-green-500' : 'text-app-text-muted'}>
                                    {game.status === 'realizado' ? 'Finalizado' : 'Aguardando'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-1 text-center md:text-left font-black text-app-text text-lg uppercase tracking-tight">{game.time_visitante_nome}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })()}

          {/* ── Artilharia ── */}
          {activeTab === 'artilharia' && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-app-text uppercase tracking-tight">Artilharia</h2>
              {scorers.length === 0 ? (
                <p className="text-center py-16 text-app-text-muted italic">Nenhum gol registrado ainda.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scorers.map((s, idx) => (
                    <div key={idx} className="bg-app-bg/30 border border-app-border rounded-3xl p-6 flex items-center gap-4 shadow-sm">
                      <div className="w-16 h-16 bg-amber-500/10 border-2 border-amber-500/20 rounded-2xl flex items-center justify-center shrink-0">
                        <Award className="w-8 h-8 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">{idx + 1}º lugar</p>
                        <p className="font-black text-app-text uppercase tracking-tight truncate">{s.nome}</p>
                        <p className="text-xs text-app-text-muted font-bold">{s.time}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-3xl font-black text-amber-500">{s.gols} <span className="text-[10px] text-app-text-muted">gol{s.gols !== 1 ? 's' : ''}</span></p>
                          {(s.assistencias ?? 0) > 0 && (
                            <p className="text-lg font-black text-blue-400">{s.assistencias} <span className="text-[10px] text-app-text-muted">assist.</span></p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Cartões ── */}
          {activeTab === 'cartoes' && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-app-text uppercase tracking-tight">Cartões</h2>
              {cards.length === 0 ? (
                <p className="text-center py-16 text-app-text-muted italic">Nenhum cartão registrado ainda.</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-app-border">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-100 dark:bg-zinc-800/50 text-app-text-muted text-[10px] font-black uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-4 text-left">Jogador</th>
                        <th className="px-6 py-4 text-left">Time</th>
                        <th className="px-6 py-4 text-center">🟨 Amarelos</th>
                        <th className="px-6 py-4 text-center">🟥 Vermelhos</th>
                        <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {cards.map((c, idx) => (
                        <tr key={idx} className="hover:bg-app-bg/30 transition-colors">
                          <td className="px-6 py-4 font-black text-app-text uppercase tracking-tight">{c.nome}</td>
                          <td className="px-6 py-4 text-xs text-app-text-muted font-bold">{c.time || '—'}</td>
                          <td className="px-6 py-4 text-center"><span className="bg-yellow-500 text-black font-black w-8 h-10 inline-flex items-center justify-center rounded text-lg shadow">{c.amarelos}</span></td>
                          <td className="px-6 py-4 text-center"><span className="bg-red-600 text-white font-black w-8 h-10 inline-flex items-center justify-center rounded text-lg shadow">{c.vermelhos}</span></td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${c.suspenso ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                              {c.suspenso ? 'Suspenso' : 'Liberado'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Times ── */}
          {activeTab === 'times' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-app-text uppercase tracking-tight">Times Inscritos</h2>
                {!isFull && (
                  <button onClick={openInscModal}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition">
                    <Plus className="w-3.5 h-3.5" /> Inscrever
                  </button>
                )}
              </div>

              {/* RF54.1: Configuração de grupos antes de gerar jogos */}
              {aguardandoGeracao && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h3 className="text-sm font-black text-blue-500 uppercase tracking-widest">Configuração de Grupos</h3>
                      <p className="text-xs text-app-text-muted mt-0.5">Ajuste os grupos antes de gerar os jogos. Cada time pode ser movido entre grupos.</p>
                    </div>
                    <button
                      onClick={handleGerarJogosGrupo}
                      disabled={gerando}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition disabled:opacity-50"
                    >
                      {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      {gerando ? 'Gerando…' : 'Gerar Jogos de Grupo'}
                    </button>
                  </div>

                  {/* Grid de grupos */}
                  <div className={`grid gap-4 grid-cols-${Math.min(champ.num_grupos, 4)}`} style={{ gridTemplateColumns: `repeat(${Math.min(champ.num_grupos, 4)}, minmax(0,1fr))` }}>
                    {gruposLetras.map(letra => {
                      const timesNoGrupo = champ.inscricoes.filter(i => i.grupo === letra);
                      return (
                        <div key={letra} className="bg-app-bg/50 border border-app-border rounded-xl p-3">
                          <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-2 flex items-center gap-1">
                            <span className="w-5 h-5 bg-blue-500 text-white rounded-md flex items-center justify-center text-[10px] font-black">{letra}</span>
                            Grupo {letra}
                          </p>
                          <div className="space-y-1">
                            {timesNoGrupo.length === 0 && (
                              <p className="text-[10px] text-app-text-muted italic">Vazio</p>
                            )}
                            {timesNoGrupo.map(insc => (
                              <div key={insc.id} className="flex items-center justify-between gap-2 bg-app-card rounded-lg px-2 py-1.5">
                                <span className="text-xs font-bold text-app-text truncate">{insc.time_nome}</span>
                                <select
                                  value={insc.grupo}
                                  onChange={e => handleEditarGrupo(insc.id, e.target.value)}
                                  className="text-[10px] font-bold bg-app-bg border border-app-border rounded px-1 py-0.5 text-app-text focus:outline-none shrink-0"
                                >
                                  {gruposLetras.map(g => <option key={g} value={g}>Gr. {g}</option>)}
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {champ.inscricoes.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-app-border rounded-3xl">
                  <Shield className="mx-auto h-14 w-14 text-app-text-muted opacity-20 mb-3" />
                  <p className="text-app-text-muted italic text-sm">Nenhum time inscrito ainda.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {champ.inscricoes.map(insc => {
                    const isExpanded = expandedTime === insc.id;
                    const jogadores  = elencos[insc.id] ?? [];
                    const isLoading  = loadingElenco[insc.id];
                    return (
                      <div key={insc.id} className="bg-app-bg/30 border border-app-border rounded-2xl overflow-hidden shadow-sm group">
                        <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition" onClick={() => toggleExpand(insc.id, insc.time)}>
                          <TimeAvatar escudo={insc.time_escudo} cor={insc.time_cor} nome={insc.time_nome} size={12} />
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-app-text uppercase tracking-tight truncate">{insc.time_nome}</p>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              {insc.time_cor && (
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: insc.time_cor }} />
                                  <span className="text-[10px] text-app-text-muted font-mono">{insc.time_cor}</span>
                                </div>
                              )}
                              {insc.grupo && (
                                <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">Grupo {insc.grupo}</span>
                              )}
                              <span className="text-[10px] text-app-text-muted flex items-center gap-1">
                                <Users className="w-3 h-3" />{insc.total_jogadores_campeonato} jogador{insc.total_jogadores_campeonato !== 1 ? 'es' : ''}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={e => { e.stopPropagation(); handleRemoveInscricao(insc); }}
                              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition opacity-0 group-hover:opacity-100" title="Remover do campeonato">
                              <UserMinus className="w-4 h-4" />
                            </button>
                            <div className="text-app-text-muted">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-app-border px-4 pb-4 pt-3">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-xs font-black text-app-text-muted uppercase tracking-widest flex items-center gap-1.5">
                                <Star className="w-3.5 h-3.5 text-yellow-500" /> Elenco neste campeonato
                              </h4>
                              <button onClick={() => openAddJog(insc.id)}
                                className="flex items-center gap-1.5 text-xs font-bold text-green-500 hover:text-green-400 transition bg-green-500/10 hover:bg-green-500/20 px-3 py-1.5 rounded-lg">
                                <Plus className="w-3.5 h-3.5" /> Adicionar Jogador
                              </button>
                            </div>
                            {isLoading ? (
                              <div className="flex justify-center py-4"><Loader2 className="animate-spin h-5 w-5 text-blue-500" /></div>
                            ) : jogadores.length === 0 ? (
                              <p className="text-xs text-app-text-muted italic text-center py-4">Nenhum jogador no elenco. Adicione pelo menu <strong>Meus Times</strong>.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {jogadores.map(jog => (
                                  <div key={jog.id} className="flex items-center justify-between bg-app-card rounded-xl px-3 py-2 group/jog">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0" style={{ backgroundColor: insc.time_cor || '#3b82f6' }}>
                                        {jog.nome.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="text-sm font-bold text-app-text truncate">{jog.nome}</span>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                      {jog.nivel_estrelas != null && <><Stars value={jog.nivel_estrelas} /><span className="text-xs text-app-text-muted font-bold">{jog.nivel_estrelas}</span></>}
                                      <button onClick={() => handleRemoveJog(insc.id, jog.id, insc.time)}
                                        className="p-1 text-red-400 hover:bg-red-500/10 rounded-lg transition opacity-0 group-hover/jog:opacity-100">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Modal Inscrever Time ────────────────────────────────────────────────── */}
      {showInscModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-app-card rounded-2xl w-full max-w-lg border border-app-border shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-app-border shrink-0">
              <h3 className="text-lg font-black text-app-text uppercase tracking-tight">Inscrever Time</h3>
              <button onClick={() => setShowInscModal(false)} className="text-app-text-muted hover:text-app-text transition"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex border-b border-app-border shrink-0">
              {(['selecionar','criar'] as const).map(t => (
                <button key={t} onClick={() => setInscTab(t)}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition ${inscTab === t ? 'border-b-2 border-green-500 text-green-500' : 'text-app-text-muted hover:text-app-text'}`}>
                  {t === 'selecionar' ? 'Selecionar Existente' : 'Criar Novo Time'}
                </button>
              ))}
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {inscTab === 'selecionar' && (
                <div className="space-y-2">
                  {availableTeams.length === 0 ? (
                    <p className="text-sm text-app-text-muted italic text-center py-4">Nenhum time disponível.</p>
                  ) : availableTeams.map(t => {
                    const semJogadores = t.total_jogadores === 0;
                    return (
                      <button key={t.id}
                        onClick={() => !semJogadores && setSelectedTimeId(t.id)}
                        disabled={semJogadores}
                        title={semJogadores ? 'Adicione jogadores a este time antes de inscrever' : undefined}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition ${
                          semJogadores
                            ? 'border-app-border bg-app-bg opacity-50 cursor-not-allowed'
                            : selectedTimeId === t.id
                              ? 'border-green-500 bg-green-500/10'
                              : 'border-app-border hover:border-green-500/40'
                        }`}>
                        <Shield className="w-5 h-5 text-app-text-muted shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-app-text text-sm">{t.nome}</span>
                          {semJogadores && (
                            <p className="text-[10px] text-amber-500 font-semibold mt-0.5">
                              Sem jogadores — adicione em Meus Times
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-app-text-muted shrink-0">
                          {t.total_jogadores} jog.
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {inscTab === 'criar' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-app-text mb-2">Escudo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-app-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-green-500 transition shrink-0"
                        onClick={() => fileRef.current?.click()}>
                        {newTime.escudo ? <img src={newTime.escudo} className="w-full h-full object-cover" /> : <Upload className="w-5 h-5 text-app-text-muted" />}
                      </div>
                      <div>
                        <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-green-500 font-bold hover:underline">Selecionar imagem</button>
                        <p className="text-[10px] text-app-text-muted mt-0.5">JPG, PNG — máx. 2 MB</p>
                      </div>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleEscudoUpload} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-app-text mb-1">Nome do time <span className="text-red-500">*</span></label>
                    <input type="text" value={newTime.nome} onChange={e => setNewTime(p => ({ ...p, nome: e.target.value }))}
                      placeholder="Ex: Leões FC"
                      className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-sm text-app-text placeholder:text-app-text-muted focus:outline-none focus:ring-2 focus:ring-green-500/40" />
                    {newTimeErrors.nome && <p className="text-red-500 text-xs mt-1">{newTimeErrors.nome}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-app-text mb-2">Cor principal</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {CORES_RAPIDAS.map(c => (
                        <button key={c} type="button" onClick={() => setNewTime(p => ({ ...p, cor: c }))}
                          className={`w-6 h-6 rounded-lg border-2 transition ${newTime.cor === c ? 'border-white scale-110 shadow' : 'border-transparent'}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="color" value={newTime.cor} onChange={e => setNewTime(p => ({ ...p, cor: e.target.value }))}
                        className="w-9 h-9 rounded-lg border border-app-border cursor-pointer bg-transparent" />
                      <span className="text-xs font-mono text-app-text">{newTime.cor}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-app-border shrink-0">
              <button onClick={() => setShowInscModal(false)} className="flex-1 py-2.5 rounded-xl border border-app-border text-app-text font-bold text-sm hover:bg-app-bg transition">Cancelar</button>
              <button onClick={inscTab === 'selecionar' ? handleInscSelecionado : handleCriarEInscrever}
                disabled={savingInsc || (inscTab === 'selecionar' && !selectedTimeId)}
                className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition disabled:opacity-40 flex items-center justify-center gap-2">
                {savingInsc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {savingInsc ? 'Inscrevendo...' : inscTab === 'selecionar' ? 'Inscrever' : 'Criar e Inscrever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Adicionar Jogador ─────────────────────────────────────────────── */}
      {showAddJog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-app-card rounded-2xl w-full max-w-sm border border-app-border shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-app-border">
              <h3 className="text-base font-black text-app-text uppercase tracking-tight flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" /> Adicionar Jogador
              </h3>
              <button onClick={() => setShowAddJog(false)} className="text-app-text-muted hover:text-app-text transition"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-app-text mb-1">Nome do jogador <span className="text-red-500">*</span></label>
                <input type="text" value={jogForm.nome} onChange={e => setJogForm(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: João Silva" autoFocus
                  className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-sm text-app-text placeholder:text-app-text-muted focus:outline-none focus:ring-2 focus:ring-yellow-500/40" />
                {jogErrors.nome && <p className="text-red-500 text-xs mt-1">{jogErrors.nome}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-app-text mb-1">Nível de habilidade</label>
                <div className="flex items-center gap-3">
                  <select value={jogForm.nivel_estrelas} onChange={e => setJogForm(p => ({ ...p, nivel_estrelas: Number(e.target.value) }))}
                    className="flex-1 bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-yellow-500/40">
                    {NIVEL_OPCOES.map(n => <option key={n} value={n}>{n} estrela{n !== 1 ? 's' : ''}</option>)}
                  </select>
                  <div className="shrink-0"><Stars value={jogForm.nivel_estrelas} /></div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-app-border">
              <button onClick={() => setShowAddJog(false)} className="flex-1 py-2.5 rounded-xl border border-app-border text-app-text font-bold text-sm hover:bg-app-bg transition">Cancelar</button>
              <button onClick={handleAddJog} disabled={savingJog}
                className="flex-1 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2">
                {savingJog ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                {savingJog ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Boletim (RF57–RF60) ─────────────────────────────────────────── */}
      {showBoletim && boletimGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-app-card rounded-2xl w-full max-w-2xl border border-app-border shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-app-border shrink-0">
              <h3 className="text-base font-black text-app-text uppercase tracking-tight flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-500" /> Boletim da Partida
              </h3>
              <button onClick={() => setShowBoletim(false)} className="text-app-text-muted hover:text-app-text transition"><X className="h-5 w-5" /></button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
              {/* Placar */}
              <div className="bg-app-bg/50 border border-app-border rounded-2xl p-4 space-y-3">
                <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest text-center">Placar</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="flex-1 text-center font-black text-app-text text-sm uppercase tracking-tight leading-tight">{boletimGame.time_casa_nome}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="0" max="99"
                      value={placarForm.casa}
                      onChange={e => setPlacarForm(p => ({ ...p, casa: e.target.value }))}
                      className="w-14 h-14 text-3xl font-black text-center bg-app-bg border-2 border-app-border rounded-2xl text-app-text focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-app-text-muted font-black text-xl">×</span>
                    <input
                      type="number" min="0" max="99"
                      value={placarForm.fora}
                      onChange={e => setPlacarForm(p => ({ ...p, fora: e.target.value }))}
                      className="w-14 h-14 text-3xl font-black text-center bg-app-bg border-2 border-app-border rounded-2xl text-app-text focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <p className="flex-1 text-center font-black text-app-text text-sm uppercase tracking-tight leading-tight">{boletimGame.time_visitante_nome}</p>
                </div>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button onClick={handleSalvarPlacar} disabled={savingPlacar}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition disabled:opacity-50">
                    {savingPlacar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardCheck className="w-3.5 h-3.5" />}
                    {savingPlacar ? 'Salvando…' : 'Salvar Placar'}
                  </button>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${boletimGame.status === 'realizado' || boletimData?.jogo?.status === 'realizada' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-app-text-muted border-app-border'}`}>
                    {boletimGame.status === 'realizado' || boletimData?.jogo?.status === 'realizada' ? 'Finalizado' : 'Em andamento'}
                  </span>
                  {(boletimGame.status !== 'realizado' && boletimData?.jogo?.status !== 'realizada') && (
                    <button onClick={handleFinalizarJogo} disabled={finalizando}
                      className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition disabled:opacity-50">
                      {finalizando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      {finalizando ? 'Finalizando…' : 'Finalizar Jogo'}
                    </button>
                  )}
                </div>
              </div>

              {loadingBoletim ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-blue-500" /></div>
              ) : boletimData && (
                <>
                  {/* ── Gols ── */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-app-text uppercase tracking-widest flex items-center gap-2">
                      <span className="text-base">⚽</span> Gols ({boletimData.gols.length})
                    </h4>

                    {/* Lista de gols */}
                    {boletimData.gols.length === 0 ? (
                      <p className="text-xs text-app-text-muted italic text-center py-3">Nenhum gol registrado.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {boletimData.gols.map(gol => (
                          <div key={gol.id} className="flex items-center justify-between bg-app-bg/30 border border-app-border rounded-xl px-4 py-2.5 group/gol">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-sm font-black text-app-text truncate">{gol.jogador_nome}</span>
                              <span className="text-[10px] text-app-text-muted">({gol.jogador_time})</span>
                              {gol.minuto && <span className="text-[10px] font-bold text-app-text-muted bg-app-bg px-1.5 py-0.5 rounded">'{gol.minuto}</span>}
                              {gol.assistencia_nome && <span className="text-[10px] text-blue-400">assist: {gol.assistencia_nome}</span>}
                            </div>
                            <button onClick={() => handleDeleteGol(gol.id)}
                              className="p-1 text-red-400 hover:bg-red-500/10 rounded-lg transition opacity-0 group-hover/gol:opacity-100 shrink-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Form adicionar gol */}
                    <div className="bg-app-bg/30 border border-app-border rounded-xl p-3 space-y-2">
                      <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Registrar Gol</p>
                      <div className="grid grid-cols-2 gap-2">
                        <select value={golForm.time} onChange={e => setGolForm(p => ({ ...p, time: e.target.value, jogador: '', assistencia: '' }))}
                          className="col-span-2 bg-app-bg border border-app-border rounded-lg px-3 py-2 text-xs text-app-text focus:outline-none focus:ring-2 focus:ring-green-500/40">
                          <option value="casa">🏠 {boletimGame.time_casa_nome}</option>
                          <option value="visitante">✈️ {boletimGame.time_visitante_nome}</option>
                        </select>
                        <select value={golForm.jogador} onChange={e => setGolForm(p => ({ ...p, jogador: e.target.value, assistencia: '' }))}
                          className="bg-app-bg border border-app-border rounded-lg px-3 py-2 text-xs text-app-text focus:outline-none focus:ring-2 focus:ring-green-500/40">
                          <option value="">Artilheiro…</option>
                          {(golForm.time === 'casa' ? boletimData.elenco_casa : boletimData.elenco_visitante).map(j => (
                            <option key={j.id} value={j.id}>{j.nome}</option>
                          ))}
                        </select>
                        <select value={golForm.assistencia} onChange={e => setGolForm(p => ({ ...p, assistencia: e.target.value }))}
                          className="bg-app-bg border border-app-border rounded-lg px-3 py-2 text-xs text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                          <option value="">Assistência (opcional)</option>
                          {(golForm.time === 'casa' ? boletimData.elenco_casa : boletimData.elenco_visitante)
                            .filter(j => j.id !== golForm.jogador)
                            .map(j => <option key={j.id} value={j.id}>{j.nome}</option>)}
                        </select>
                        <input type="number" min="0" max="120" placeholder="Minuto" value={golForm.minuto}
                          onChange={e => setGolForm(p => ({ ...p, minuto: e.target.value }))}
                          className="bg-app-bg border border-app-border rounded-lg px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted focus:outline-none focus:ring-2 focus:ring-green-500/40" />
                        <button onClick={handleAddGol} disabled={savingGol || !golForm.jogador}
                          className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-2 text-xs font-black uppercase tracking-widest transition disabled:opacity-40 flex items-center justify-center gap-1.5">
                          {savingGol ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          Registrar
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Cartões ── */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-app-text uppercase tracking-widest flex items-center gap-2">
                      <span className="text-base">🟨🟥</span> Cartões ({boletimData.cartoes.length})
                    </h4>

                    {/* Lista de cartões */}
                    {boletimData.cartoes.length === 0 ? (
                      <p className="text-xs text-app-text-muted italic text-center py-3">Nenhum cartão registrado.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {boletimData.cartoes.map(c => (
                          <div key={c.id} className="flex items-center justify-between bg-app-bg/30 border border-app-border rounded-xl px-4 py-2.5 group/cartao">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`text-base ${c.tipo === 'amarelo' ? 'text-yellow-400' : 'text-red-500'}`}>
                                {c.tipo === 'amarelo' ? '🟨' : '🟥'}
                              </span>
                              <span className="text-sm font-black text-app-text truncate">{c.jogador_nome}</span>
                              <span className="text-[10px] text-app-text-muted">({c.jogador_time})</span>
                              {c.minuto && <span className="text-[10px] font-bold text-app-text-muted bg-app-bg px-1.5 py-0.5 rounded">'{c.minuto}</span>}
                            </div>
                            <button onClick={() => handleDeleteCartao(c.id)}
                              className="p-1 text-red-400 hover:bg-red-500/10 rounded-lg transition opacity-0 group-hover/cartao:opacity-100 shrink-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Form adicionar cartão */}
                    <div className="bg-app-bg/30 border border-app-border rounded-xl p-3 space-y-2">
                      <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">Registrar Cartão</p>
                      <div className="grid grid-cols-2 gap-2">
                        <select value={cartaoForm.time} onChange={e => setCartaoForm(p => ({ ...p, time: e.target.value, jogador: '' }))}
                          className="bg-app-bg border border-app-border rounded-lg px-3 py-2 text-xs text-app-text focus:outline-none focus:ring-2 focus:ring-yellow-500/40">
                          <option value="casa">🏠 {boletimGame.time_casa_nome}</option>
                          <option value="visitante">✈️ {boletimGame.time_visitante_nome}</option>
                        </select>
                        <select value={cartaoForm.tipo} onChange={e => setCartaoForm(p => ({ ...p, tipo: e.target.value }))}
                          className="bg-app-bg border border-app-border rounded-lg px-3 py-2 text-xs text-app-text focus:outline-none focus:ring-2 focus:ring-yellow-500/40">
                          <option value="amarelo">🟨 Amarelo</option>
                          <option value="vermelho">🟥 Vermelho</option>
                        </select>
                        <select value={cartaoForm.jogador} onChange={e => setCartaoForm(p => ({ ...p, jogador: e.target.value }))}
                          className="bg-app-bg border border-app-border rounded-lg px-3 py-2 text-xs text-app-text focus:outline-none focus:ring-2 focus:ring-yellow-500/40">
                          <option value="">Jogador…</option>
                          {(cartaoForm.time === 'casa' ? boletimData.elenco_casa : boletimData.elenco_visitante).map(j => (
                            <option key={j.id} value={j.id}>{j.nome}</option>
                          ))}
                        </select>
                        <input type="number" min="0" max="120" placeholder="Minuto" value={cartaoForm.minuto}
                          onChange={e => setCartaoForm(p => ({ ...p, minuto: e.target.value }))}
                          className="bg-app-bg border border-app-border rounded-lg px-3 py-2 text-xs text-app-text placeholder:text-app-text-muted focus:outline-none focus:ring-2 focus:ring-yellow-500/40" />
                        <button onClick={handleAddCartao} disabled={savingCartao || !cartaoForm.jogador}
                          className="col-span-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg px-3 py-2 text-xs font-black uppercase tracking-widest transition disabled:opacity-40 flex items-center justify-center gap-1.5">
                          {savingCartao ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          Registrar Cartão
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-app-border shrink-0">
              <button onClick={() => setShowBoletim(false)}
                className="w-full py-2.5 rounded-xl border border-app-border text-app-text font-bold text-sm hover:bg-app-bg transition">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Editar Jogo (RF56) ───────────────────────────────────────────── */}
      {showEditJogo && editJogo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-app-card rounded-2xl w-full max-w-md border border-app-border shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-app-border">
              <h3 className="text-base font-black text-app-text uppercase tracking-tight flex items-center gap-2">
                <Pencil className="h-4 w-4 text-blue-500" /> Editar Jogo
              </h3>
              <button onClick={() => setShowEditJogo(false)} className="text-app-text-muted hover:text-app-text transition"><X className="h-5 w-5" /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Partida */}
              <div className="bg-app-bg/50 border border-app-border rounded-xl px-4 py-3 text-center">
                <p className="text-[10px] text-app-text-muted font-black uppercase tracking-widest mb-1">Partida</p>
                <p className="font-black text-app-text text-sm uppercase tracking-tight">
                  {editJogo.time_casa_nome} <span className="text-app-text-muted font-normal">vs</span> {editJogo.time_visitante_nome}
                </p>
              </div>

              {/* Conflito (RF55) */}
              {conflito && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-orange-500 uppercase tracking-widest">Conflito de Horário</p>
                      <p className="text-xs text-app-text-muted mt-0.5">{conflito.mensagem}</p>
                    </div>
                  </div>
                  {conflito.sugestoes.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-2">Horários sugeridos:</p>
                      <div className="flex flex-wrap gap-2">
                        {conflito.sugestoes.map((s, i) => (
                          <button key={i}
                            onClick={() => { setEditForm(p => ({ ...p, data: toDatetimeLocal(s) })); setConflito(null); }}
                            className="text-[10px] font-bold bg-blue-500/10 border border-blue-500/30 text-blue-500 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition">
                            {fmtDatetime(s)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Data e hora */}
              <div>
                <label className="block text-xs font-bold text-app-text mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-app-text-muted" /> Data e hora
                </label>
                <input type="datetime-local" value={editForm.data}
                  onChange={e => { setEditForm(p => ({ ...p, data: e.target.value })); setConflito(null); }}
                  className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>

              {/* Local */}
              <div>
                <label className="block text-xs font-bold text-app-text mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-app-text-muted" /> Local
                </label>
                <input type="text" value={editForm.local}
                  onChange={e => setEditForm(p => ({ ...p, local: e.target.value }))}
                  placeholder="Ex: Estádio Municipal, Campo A"
                  className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-2.5 text-sm text-app-text placeholder:text-app-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-app-border">
              <button onClick={() => setShowEditJogo(false)} className="flex-1 py-2.5 rounded-xl border border-app-border text-app-text font-bold text-sm hover:bg-app-bg transition">Cancelar</button>
              <button onClick={handleSaveJogo} disabled={savingJogo}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2">
                {savingJogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                {savingJogo ? 'Salvando...' : conflito ? 'Salvar mesmo assim' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChampionshipDetail;
