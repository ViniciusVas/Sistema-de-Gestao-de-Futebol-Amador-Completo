import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Trophy, Calendar, Settings, Users, Loader2, Table as TableIcon,
  Play, Award, ClipboardCheck, ChevronLeft, Clock, MapPin, FileText, X, Share2,
} from "lucide-react";
import publicApi from "../services/publicApi";

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Game {
  id: string;
  time_casa_nome: string; time_visitante_nome: string;
  gols_casa: number | null; gols_fora: number | null;
  data: string | null; local: string;
  status: string; rodada: number | null; fase: string;
}
interface Standing { time: string; P: number; J: number; V: number; E: number; D: number; GM: number; GC: number; SG: number; classificacao?: number; }
interface Scorer { nome: string; time: string; gols: number; jogos: number; media: number; assistencias: number; }
interface Assister { nome: string; time: string; assistencias: number; jogos: number; }
interface CardEntry { nome: string; time: string; amarelos: number; vermelhos: number; suspenso: boolean; }
interface BoletimGol { id: string; jogador_nome: string; jogador_time: string; assistencia_nome: string | null; minuto: number | null; }
interface BoletimCartao { id: string; jogador_nome: string; jogador_time: string; tipo: 'amarelo' | 'vermelho'; minuto: number | null; }
interface Boletim { jogo: any; gols: BoletimGol[]; cartoes: BoletimCartao[]; }

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtDatetime = (iso: string | null) => {
  if (!iso) return 'Data a definir';
  try { return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); }
  catch { return iso; }
};

// ── Componente ─────────────────────────────────────────────────────────────────
const PublicChampionship = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [champ,     setChamp]     = useState<any | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<'tabela'|'jogos'|'artilharia'|'assistencias'|'cartoes'>('tabela');
  const [standings, setStandings] = useState<any>([]);
  const [games,     setGames]     = useState<Game[]>([]);
  const [scorers,    setScorers]    = useState<Scorer[]>([]);
  const [assisters,  setAssisters]  = useState<Assister[]>([]);
  const [cards,      setCards]      = useState<CardEntry[]>([]);

  // boletim
  const [showBoletim,    setShowBoletim]    = useState(false);
  const [boletim,        setBoletim]        = useState<Boletim|null>(null);
  const [loadingBoletim, setLoadingBoletim] = useState(false);
  const [boletimGame,    setBoletimGame]    = useState<Game|null>(null);

  useEffect(() => {
    Promise.all([
      publicApi.get(`/public/campeonatos/${id}/`),
      publicApi.get(`/campeonatos/${id}/partidas/`),
      publicApi.get(`/campeonatos/${id}/classificacao/`),
    ]).then(([champR, gamesR, standR]) => {
      setChamp({ ...champR.data, id: String(champR.data.id) });
      setGames(gamesR.data.map((g: any) => ({
        id: String(g.id),
        time_casa_nome:      g.time_casa_nome,
        time_visitante_nome: g.time_fora_nome,
        gols_casa:  g.gols_casa ?? null,
        gols_fora:  g.gols_fora ?? null,
        data:   g.data || null,
        local:  g.local || '',
        status: g.status,
        rodada: g.rodada ?? null,
        fase:   g.fase || 'grupos',
      })));
      setStandings(standR.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (activeTab === 'artilharia')
      publicApi.get(`/campeonatos/${id}/artilharia/`).then(r => setScorers(r.data)).catch(() => {});
    if (activeTab === 'assistencias')
      publicApi.get(`/campeonatos/${id}/assistencias/`).then(r => setAssisters(r.data)).catch(() => {});
    if (activeTab === 'cartoes')
      publicApi.get(`/campeonatos/${id}/cartoes/`).then(r => setCards(r.data)).catch(() => {});
  }, [activeTab, id]);

  const openBoletim = async (game: Game) => {
    setBoletimGame(game);
    setBoletim(null);
    setLoadingBoletim(true);
    setShowBoletim(true);
    try {
      const r = await publicApi.get(`/partidas/${game.id}/boletim/`);
      setBoletim(r.data);
    } catch { /* ignore */ }
    finally { setLoadingBoletim(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
    </div>
  );
  if (!champ) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Trophy className="w-16 h-16 text-app-text-muted opacity-20" />
      <p className="text-app-text-muted">Campeonato não encontrado ou não público.</p>
      <button onClick={() => navigate('/c')} className="text-blue-500 hover:underline text-sm font-bold">Ver todos</button>
    </div>
  );

  // Normalize standings to flat array if it's an object of groups
  const standingsFlat: Standing[] = Array.isArray(standings)
    ? standings
    : Object.entries(standings).flatMap(([grupo, rows]: [string, any]) =>
        (rows as Standing[]).map(r => ({ ...r, _grupo: grupo }))
      );

  const rodadas = games.reduce<Record<string, Game[]>>((acc, g) => {
    const key = `${g.fase}__${g.rodada ?? 0}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-app-bg">
      {/* Header bar */}
      <div className="border-b border-app-border bg-app-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <button onClick={() => navigate('/c')}
            className="flex items-center gap-1.5 text-app-text-muted hover:text-blue-500 transition font-bold text-sm">
            <ChevronLeft className="w-4 h-4" /> Todos os campeonatos
          </button>
          <button onClick={() => navigate('/login')}
            className="text-xs font-black uppercase tracking-widest text-app-text-muted hover:text-blue-500 transition px-4 py-2 rounded-xl border border-app-border hover:border-blue-500/30">
            Área do Organizador
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Championship header */}
        <div className="bg-app-card rounded-3xl border border-app-border p-8 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Trophy className="w-40 h-40 text-app-text" /></div>
          <div className="relative z-10 space-y-4">
            <h1 className="text-3xl font-black text-app-text uppercase tracking-tighter">{champ.nome}</h1>
            {champ.descricao && <p className="text-app-text-muted text-sm">{champ.descricao}</p>}
            <div className="flex flex-wrap gap-3">
              <span className="text-[10px] text-app-text-muted font-black uppercase tracking-widest flex items-center bg-zinc-100 dark:bg-zinc-800/50 border border-app-border px-3 py-1.5 rounded-full">
                <Settings className="w-3.5 h-3.5 mr-1.5" />{champ.formato?.replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] text-app-text-muted font-black uppercase tracking-widest flex items-center bg-zinc-100 dark:bg-zinc-800/50 border border-app-border px-3 py-1.5 rounded-full">
                <Users className="w-3.5 h-3.5 mr-1.5" />{champ.tipo}
              </span>
              {champ.data_inicio && (
                <span className="text-[10px] text-app-text-muted font-black uppercase tracking-widest flex items-center bg-zinc-100 dark:bg-zinc-800/50 border border-app-border px-3 py-1.5 rounded-full">
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  {new Date(champ.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')}
                  {champ.data_fim && ` → ${new Date(champ.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')}`}
                </span>
              )}
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${champ.status === 'ativo' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-zinc-100 dark:bg-zinc-800/50 border-app-border text-app-text-muted'}`}>
                {champ.status === 'ativo' ? 'Em andamento' : champ.status}
              </span>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pt-2 pb-1">
              {([
                { id: 'tabela',       icon: TableIcon,     label: 'Classificação' },
                { id: 'jogos',        icon: Play,           label: 'Jogos' },
                { id: 'artilharia',   icon: Award,          label: 'Artilharia' },
                { id: 'assistencias', icon: Share2,         label: 'Assistências' },
                { id: 'cartoes',      icon: ClipboardCheck, label: 'Cartões' },
              ] as const).map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-app-text-muted border border-app-border hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}>
                  <tab.icon className="w-3.5 h-3.5 mr-2" />{tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab content */}
        <div className="bg-app-card rounded-3xl border border-app-border p-8 shadow-sm">

          {/* ── Classificação ── */}
          {activeTab === 'tabela' && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-app-text uppercase tracking-tight">Classificação</h2>
              {Array.isArray(standings) ? (
                <StandingsTable rows={standingsFlat} />
              ) : (
                <div className="space-y-6">
                  {Object.entries(standings).sort().map(([grupo, rows]: [string, any]) => (
                    <div key={grupo}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-6 h-6 bg-blue-500 text-white rounded-md flex items-center justify-center text-xs font-black">{grupo}</span>
                        <h3 className="text-xs font-black text-app-text-muted uppercase tracking-widest">Grupo {grupo}</h3>
                      </div>
                      <StandingsTable rows={rows} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Jogos ── */}
          {activeTab === 'jogos' && (
            <div className="space-y-8">
              <h2 className="text-xl font-black text-app-text uppercase tracking-tight">Calendário e Resultados</h2>
              {games.length === 0 ? (
                <p className="text-center py-16 text-app-text-muted italic">Nenhum jogo gerado ainda.</p>
              ) : (
                Object.entries(rodadas)
                  .sort(([a], [b]) => {
                    const [fa, ra] = a.split('__');
                    const [fb, rb] = b.split('__');
                    const ord: Record<string,number> = { grupos:0, oitavas:1, quartas:2, semi:3, final:4 };
                    return (ord[fa]??0) - (ord[fb]??0) || Number(ra) - Number(rb);
                  })
                  .map(([key, jogos]) => {
                    const [fase, rodadaStr] = key.split('__');
                    const rodada = Number(rodadaStr);
                    const label = fase !== 'grupos' ? fase.charAt(0).toUpperCase() + fase.slice(1) : `Rodada ${rodada || '—'}`;
                    return (
                      <div key={key} className="space-y-3">
                        <h3 className="text-xs font-black text-app-text-muted uppercase tracking-[0.2em] italic flex items-center gap-2">
                          <span className="h-px flex-1 bg-app-border" />{label}<span className="h-px flex-1 bg-app-border" />
                        </h3>
                        {jogos.map(game => (
                          <div key={game.id} className="bg-app-bg/30 border border-app-border rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm group relative">
                            {game.status === 'realizada' && (
                              <button onClick={() => openBoletim(game)}
                                className="absolute top-3 right-3 p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg transition opacity-0 group-hover:opacity-100" title="Ver boletim">
                                <FileText className="w-4 h-4" />
                              </button>
                            )}
                            <div className="flex-1 text-center md:text-right font-black text-app-text text-lg uppercase tracking-tight">{game.time_casa_nome}</div>
                            <div className="flex flex-col items-center gap-2">
                              <div className="flex items-center gap-4 bg-app-bg/50 p-3 rounded-[2rem] border border-app-border shadow-inner">
                                <span className={`text-4xl font-black w-14 h-14 flex items-center justify-center rounded-2xl ${game.status === 'realizada' ? 'bg-white dark:bg-zinc-800 text-app-text shadow-lg' : 'bg-app-bg text-app-text-muted'}`}>
                                  {game.gols_casa ?? '—'}
                                </span>
                                <span className="text-app-text-muted font-black text-xl italic select-none">VS</span>
                                <span className={`text-4xl font-black w-14 h-14 flex items-center justify-center rounded-2xl ${game.status === 'realizada' ? 'bg-white dark:bg-zinc-800 text-app-text shadow-lg' : 'bg-app-bg text-app-text-muted'}`}>
                                  {game.gols_fora ?? '—'}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-black text-app-text-muted uppercase tracking-widest">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDatetime(game.data)}</span>
                                {game.local && <><span className="w-1 h-1 bg-app-border rounded-full" /><span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{game.local}</span></>}
                                <span className="w-1 h-1 bg-app-border rounded-full" />
                                <span className={game.status === 'realizada' ? 'text-green-500' : 'text-app-text-muted'}>
                                  {game.status === 'realizada' ? 'Finalizado' : 'Aguardando'}
                                </span>
                              </div>
                            </div>
                            <div className="flex-1 text-center md:text-left font-black text-app-text text-lg uppercase tracking-tight">{game.time_visitante_nome}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })
              )}
            </div>
          )}

          {/* ── Artilharia (RF63 / RF64) ── */}
          {activeTab === 'artilharia' && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-app-text uppercase tracking-tight">Artilharia</h2>
              {scorers.length === 0 ? (
                <p className="text-center py-16 text-app-text-muted italic">Nenhum gol registrado ainda.</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-app-border">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-100 dark:bg-zinc-800/50 text-app-text-muted text-[10px] font-black uppercase tracking-widest">
                      <tr>
                        <th className="px-5 py-4 text-center">POS</th>
                        <th className="px-5 py-4 text-left">Jogador</th>
                        <th className="px-5 py-4 text-left">Time</th>
                        <th className="px-5 py-4 text-center">Gols</th>
                        <th className="px-5 py-4 text-center">Jogos</th>
                        <th className="px-5 py-4 text-center">Média</th>
                        <th className="px-5 py-4 text-center">Assists</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {scorers.map((s, idx) => (
                        <tr key={idx} className="hover:bg-app-bg/30 transition-colors">
                          <td className="px-5 py-4 text-center font-black text-app-text-muted">{idx + 1}º</td>
                          <td className="px-5 py-4 font-black text-app-text uppercase tracking-tight">{s.nome}</td>
                          <td className="px-5 py-4 text-xs text-app-text-muted font-bold">{s.time}</td>
                          <td className="px-5 py-4 text-center">
                            <span className="text-2xl font-black text-amber-500">{s.gols}</span>
                          </td>
                          <td className="px-5 py-4 text-center font-bold text-app-text-muted">{s.jogos}</td>
                          <td className="px-5 py-4 text-center font-bold text-app-text-muted">{s.media}</td>
                          <td className="px-5 py-4 text-center">
                            {s.assistencias > 0
                              ? <span className="text-lg font-black text-blue-400">{s.assistencias}</span>
                              : <span className="text-app-text-muted">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Ranking de Assistências (RF67.4) ── */}
          {activeTab === 'assistencias' && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-app-text uppercase tracking-tight">Ranking de Assistências</h2>
              {assisters.length === 0 ? (
                <p className="text-center py-16 text-app-text-muted italic">Nenhuma assistência registrada ainda.</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-app-border">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-100 dark:bg-zinc-800/50 text-app-text-muted text-[10px] font-black uppercase tracking-widest">
                      <tr>
                        <th className="px-5 py-4 text-center">POS</th>
                        <th className="px-5 py-4 text-left">Jogador</th>
                        <th className="px-5 py-4 text-left">Time</th>
                        <th className="px-5 py-4 text-center">Assistências</th>
                        <th className="px-5 py-4 text-center">Jogos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {assisters.map((a, idx) => (
                        <tr key={idx} className="hover:bg-app-bg/30 transition-colors">
                          <td className="px-5 py-4 text-center font-black text-app-text-muted">{idx + 1}º</td>
                          <td className="px-5 py-4 font-black text-app-text uppercase tracking-tight">{a.nome}</td>
                          <td className="px-5 py-4 text-xs text-app-text-muted font-bold">{a.time}</td>
                          <td className="px-5 py-4 text-center">
                            <span className="text-2xl font-black text-blue-400">{a.assistencias}</span>
                          </td>
                          <td className="px-5 py-4 text-center font-bold text-app-text-muted">{a.jogos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Cartões e Suspensões (RF67.6) ── */}
          {activeTab === 'cartoes' && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-app-text uppercase tracking-tight">Cartões e Suspensões</h2>
              {cards.length === 0 ? (
                <p className="text-center py-16 text-app-text-muted italic">Nenhum cartão registrado ainda.</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-app-border">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-100 dark:bg-zinc-800/50 text-app-text-muted text-[10px] font-black uppercase tracking-widest">
                      <tr>
                        <th className="px-5 py-4 text-left">Jogador</th>
                        <th className="px-5 py-4 text-left">Time</th>
                        <th className="px-5 py-4 text-center">🟨</th>
                        <th className="px-5 py-4 text-center">🟥</th>
                        <th className="px-5 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {cards.map((c, idx) => (
                        <tr key={idx} className="hover:bg-app-bg/30 transition-colors">
                          <td className="px-5 py-4 font-black text-app-text uppercase tracking-tight">{c.nome}</td>
                          <td className="px-5 py-4 text-xs text-app-text-muted font-bold">{c.time || '—'}</td>
                          <td className="px-5 py-4 text-center"><span className="bg-yellow-500 text-black font-black w-8 h-8 inline-flex items-center justify-center rounded text-sm shadow">{c.amarelos}</span></td>
                          <td className="px-5 py-4 text-center"><span className="bg-red-600 text-white font-black w-8 h-8 inline-flex items-center justify-center rounded text-sm shadow">{c.vermelhos}</span></td>
                          <td className="px-5 py-4 text-center">
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
        </div>
      </div>

      {/* ── Boletim Modal (read-only, RF67.5) ─────────────────────────────────── */}
      {showBoletim && boletimGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-app-card rounded-2xl w-full max-w-xl border border-app-border shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-app-border shrink-0">
              <h3 className="text-base font-black text-app-text uppercase tracking-tight flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-500" /> Boletim
              </h3>
              <button onClick={() => setShowBoletim(false)} className="text-app-text-muted hover:text-app-text"><X className="h-5 w-5" /></button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {/* Placar */}
              <div className="bg-app-bg/50 border border-app-border rounded-2xl p-4 text-center">
                <p className="text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-2">Resultado Final</p>
                <div className="flex items-center justify-center gap-4">
                  <p className="flex-1 text-right font-black text-app-text uppercase tracking-tight">{boletimGame.time_casa_nome}</p>
                  <div className="flex items-center gap-3 bg-app-bg px-4 py-2 rounded-2xl border border-app-border">
                    <span className="text-3xl font-black">{boletim?.jogo?.gols_casa ?? boletimGame.gols_casa ?? '—'}</span>
                    <span className="text-app-text-muted font-black">×</span>
                    <span className="text-3xl font-black">{boletim?.jogo?.gols_fora ?? boletimGame.gols_fora ?? '—'}</span>
                  </div>
                  <p className="flex-1 text-left font-black text-app-text uppercase tracking-tight">{boletimGame.time_visitante_nome}</p>
                </div>
              </div>

              {loadingBoletim ? (
                <div className="flex justify-center py-6"><Loader2 className="animate-spin h-6 w-6 text-blue-500" /></div>
              ) : boletim && (
                <>
                  {/* Gols */}
                  <div>
                    <h4 className="text-xs font-black text-app-text uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span>⚽</span> Gols ({boletim.gols.length})
                    </h4>
                    {boletim.gols.length === 0 ? (
                      <p className="text-xs text-app-text-muted italic text-center py-2">Nenhum gol.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {boletim.gols.map(g => (
                          <div key={g.id} className="flex items-center gap-3 bg-app-bg/30 border border-app-border rounded-xl px-4 py-2.5">
                            <span className="text-sm font-black text-app-text">{g.jogador_nome}</span>
                            <span className="text-[10px] text-app-text-muted">({g.jogador_time})</span>
                            {g.minuto && <span className="text-[10px] font-bold text-app-text-muted bg-app-bg px-1.5 py-0.5 rounded">'{g.minuto}</span>}
                            {g.assistencia_nome && <span className="text-[10px] text-blue-400 ml-auto">assist: {g.assistencia_nome}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cartões */}
                  <div>
                    <h4 className="text-xs font-black text-app-text uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span>🟨🟥</span> Cartões ({boletim.cartoes.length})
                    </h4>
                    {boletim.cartoes.length === 0 ? (
                      <p className="text-xs text-app-text-muted italic text-center py-2">Nenhum cartão.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {boletim.cartoes.map(c => (
                          <div key={c.id} className="flex items-center gap-3 bg-app-bg/30 border border-app-border rounded-xl px-4 py-2.5">
                            <span>{c.tipo === 'amarelo' ? '🟨' : '🟥'}</span>
                            <span className="text-sm font-black text-app-text">{c.jogador_nome}</span>
                            <span className="text-[10px] text-app-text-muted">({c.jogador_time})</span>
                            {c.minuto && <span className="text-[10px] font-bold text-app-text-muted bg-app-bg px-1.5 py-0.5 rounded ml-auto">'{c.minuto}</span>}
                          </div>
                        ))}
                      </div>
                    )}
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
    </div>
  );
};

// ── Sub-componente de tabela de classificação ──────────────────────────────────
const StandingsTable = ({ rows }: { rows: Standing[] }) => (
  <div className="overflow-x-auto rounded-2xl border border-app-border bg-app-bg/20">
    <table className="w-full text-sm">
      <thead className="bg-zinc-100 dark:bg-zinc-800/50 text-app-text-muted text-[10px] font-black uppercase tracking-widest">
        <tr>{['POS','TIME','PTS','PJ','V','E','D','GP','GC','SG'].map(h => (
          <th key={h} className={`px-4 py-4 ${h === 'TIME' ? 'text-left' : 'text-center'}`}>{h}</th>
        ))}</tr>
      </thead>
      <tbody className="divide-y divide-app-border">
        {rows.map((team, idx) => (
          <tr key={idx} className="hover:bg-app-bg/30 transition-colors">
            <td className="px-4 py-4 font-black text-app-text-muted text-center">{team.classificacao ?? idx + 1}º</td>
            <td className="px-4 py-4 font-black text-app-text uppercase tracking-tight">{team.time}</td>
            <td className="px-4 py-4 text-center font-black text-blue-500 text-lg">{team.P ?? 0}</td>
            <td className="px-4 py-4 text-center font-bold text-app-text-muted">{team.J ?? 0}</td>
            <td className="px-4 py-4 text-center font-bold text-green-500">{team.V ?? 0}</td>
            <td className="px-4 py-4 text-center font-bold text-app-text-muted">{team.E ?? 0}</td>
            <td className="px-4 py-4 text-center font-bold text-red-500">{team.D ?? 0}</td>
            <td className="px-4 py-4 text-center font-bold text-app-text-muted">{team.GM ?? 0}</td>
            <td className="px-4 py-4 text-center font-bold text-app-text-muted">{team.GC ?? 0}</td>
            <td className={`px-4 py-4 text-center font-black ${(team.SG??0)>0?'text-green-500':(team.SG??0)<0?'text-red-500':'text-app-text-muted'}`}>{team.SG ?? 0}</td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={10} className="px-4 py-10 text-center text-app-text-muted italic text-xs">Nenhum jogo realizado ainda.</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

export default PublicChampionship;
