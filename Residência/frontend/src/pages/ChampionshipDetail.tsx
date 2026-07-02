import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  ChevronLeft, 
  Trophy, 
  Users, 
  Calendar, 
  Settings, 
  Plus, 
  Loader2,
  Table as TableIcon,
  Play,
  ClipboardCheck,
  Award,
  X,
  Trash2,
  UserPlus,
  MapPin
} from "lucide-react";
import api from "../services/api";
import { toast } from "react-hot-toast";
import { cn } from "../lib/utils";

interface Player {
  id: string;
  nome?: string;
  name?: string;
}

interface Team {
  id: string;
  name: string;
  color?: string;
  jogadores: { 
    id: string;
    player: Player;
  }[];
}

interface Game {
  id: string;
  round: number;
  homeTeam: { id: string; name: string; color?: string };
  awayTeam: { id: string; name: string; color?: string };
  homeScore: number;
  awayScore: number;
  status: string;
  date?: string;
  location?: string;
  eventos: GameEvent[];
}

interface StandingsEntry {
  id: string;
  nome: string;
  cor?: string;
  pts: number;
  pj: number;
  v: number;
  e: number;
  d: number;
  gp: number;
  gc: number;
  sg: number;
}

interface ScorerEntry {
  id: string;
  nome: string;
  time: string;
  gols: number;
}

interface AssistEntry {
  id: string;
  nome: string;
  time: string;
  assistencias: number;
}

interface CardEntry {
  id: string;
  nome: string;
  time: string;
  amarelos: number;
  vermelhos: number;
  suspenso: boolean;
}

interface GameEvent {
  type: string;
  playerId: string;
  playerName: string;
  teamId: string;
}

interface Championship {
  id: string;
  name: string;
  description?: string;
  format: string;
  isHomeAndAway: boolean;
  status: string;
  startDate?: string;
  times: Team[];
  jogos: Game[];
}

const ChampionshipDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [champ, setChamp] = useState<Championship | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tabela' | 'jogos' | 'times' | 'artilharia' | 'cartoes'>('tabela');
  
  const [standings, setStandings] = useState<StandingsEntry[]>([]);
  const [scorers, setScorers] = useState<ScorerEntry[]>([]);
  const [assists, setAssists] = useState<AssistEntry[]>([]);
  const [cards, setCards] = useState<CardEntry[]>([]);
  
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState("#3b82f6");
  
  const [selectedTeamForPlayer, setSelectedTeamForPlayer] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");

  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedGameForSchedule, setSelectedGameForSchedule] = useState<Game | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleLocation, setScheduleLocation] = useState("");

  useEffect(() => {
    fetchChamp();
    fetchPlayers();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'tabela') fetchStandings();
    if (activeTab === 'artilharia') {
      fetchScorers();
      fetchAssists();
    }
    if (activeTab === 'cartoes') fetchCards();
  }, [activeTab, id]);

  const fetchStandings = async () => {
    try {
      const response = await api.get(`/championships/${id}/classificacao`);
      setStandings(response.data);
    } catch (error) {
      console.error("Error fetching standings", error);
    }
  };

  const fetchScorers = async () => {
    try {
      const response = await api.get(`/championships/${id}/artilharia`);
      setScorers(response.data);
    } catch (error) {
      console.error("Error fetching scorers", error);
    }
  };

  const fetchAssists = async () => {
    try {
      const response = await api.get(`/championships/${id}/assistencias`);
      setAssists(response.data);
    } catch (error) {
      console.error("Error fetching assists", error);
    }
  };

  const fetchCards = async () => {
    try {
      const response = await api.get(`/championships/${id}/cartoes`);
      setCards(response.data);
    } catch (error) {
      console.error("Error fetching cards", error);
    }
  };

  const fetchChamp = async () => {
    try {
      const response = await api.get(`/championships/${id}`);
      setChamp(response.data);
    } catch (error) {
      toast.error("Erro ao carregar campeonato.");
      navigate("/championships");
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayers = async () => {
    try {
      const response = await api.get("/players");
      const sorted = response.data.sort((a: any, b: any) => 
        (a.nome || a.name || "").localeCompare(b.nome || b.name || "")
      );
      setAllPlayers(sorted);
    } catch (error) {
      console.error("Error fetching players", error);
    }
  };

  const handleGenerateTable = async () => {
    if (!champ || champ.times.length < 2) {
      toast.error("Adicione pelo menos 2 times para gerar a tabela.");
      return;
    }
    
    if (champ.jogos.length > 0 && !confirm("Isso apagará a tabela atual e gerará uma nova. Continuar?")) {
      return;
    }

    try {
      setLoading(true);
      await api.post(`/championships/${id}/gerar_tabela`);
      toast.success("Tabela gerada com sucesso!");
      fetchChamp();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erro ao gerar tabela.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName) return;
    try {
      await api.post(`/championships/${id}/times`, { name: newTeamName, color: newTeamColor });
      toast.success("Time adicionado!");
      setNewTeamName("");
      setNewTeamColor("#3b82f6");
      setShowAddTeamModal(false);
      fetchChamp();
    } catch (error) {
      toast.error("Erro ao adicionar time.");
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm("Tem certeza que deseja remover este time?")) return;
    try {
      await api.delete(`/championships/times/${teamId}`);
      toast.success("Time removido!");
      fetchChamp();
    } catch (error) {
      toast.error("Erro ao remover time.");
    }
  };

  const [isAddingNewPlayer, setIsAddingNewPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");

  const handleCreateAndAddPlayer = async (teamId: string) => {
    if (!newPlayerName) return;
    try {
      // 1. Create the player
      const playerRes = await api.post("/players", { nome: newPlayerName });
      const newPlayer = playerRes.data;
      
      // 2. Add to team
      await api.post(`/championships/times/${teamId}/jogadores`, { playerId: newPlayer.id });
      
      toast.success("Jogador criado e escalado!");
      setSelectedTeamForPlayer(null);
      setNewPlayerName("");
      setIsAddingNewPlayer(false);
      fetchChamp();
      fetchPlayers(); // Refresh the list
    } catch (error) {
      toast.error("Erro ao criar jogador.");
    }
  };

  const handleAddPlayer = async (teamId: string) => {
    if (!selectedPlayerId) return;
    try {
      await api.post(`/championships/times/${teamId}/jogadores`, { playerId: selectedPlayerId });
      toast.success("Jogador adicionado ao time!");
      setSelectedTeamForPlayer(null);
      setSelectedPlayerId("");
      fetchChamp();
    } catch (error) {
      toast.error("Erro ao adicionar jogador.");
    }
  };

  const handleRemovePlayer = async (jogadorTimeId: string) => {
    if (!confirm("Remover jogador do time?")) return;
    try {
      await api.delete(`/championships/jogadores/${jogadorTimeId}`);
      toast.success("Jogador removido!");
      fetchChamp();
    } catch (error) {
      toast.error("Erro ao remover jogador.");
    }
  };

  const handleUpdateMatch = async () => {
    if (!selectedGame) return;
    try {
      await api.put(`/championships/jogos/${selectedGame.id}`, {
        homeScore: homeGoals,
        awayScore: awayGoals,
        events: gameEvents,
        status: 'finalizado'
      });
      toast.success("Resultado salvo!");
      setShowResultModal(false);
      fetchChamp();
      if (activeTab === 'tabela') fetchStandings();
    } catch (error) {
      toast.error("Erro ao atualizar jogo.");
    }
  };

  const handleSaveSchedule = async () => {
    if (!selectedGameForSchedule) return;
    try {
      await api.put(`/championships/jogos/${selectedGameForSchedule.id}`, {
        date: scheduleDate ? new Date(scheduleDate).toISOString() : null,
        location: scheduleLocation || ""
      });
      toast.success("Jogo agendado com sucesso!");
      setShowScheduleModal(false);
      fetchChamp();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erro ao salvar agendamento.");
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12 min-screen space-y-4">
      <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
    </div>
  );
  
  if (!champ) return null;

  return (
    <div className="space-y-6 pb-20">
       <button 
        onClick={() => navigate("/championships")}
        className="flex items-center text-app-text-muted hover:text-blue-500 transition font-bold"
      >
        <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
      </button>

      <div className="bg-app-card rounded-3xl border border-app-border p-8 relative overflow-hidden shadow-2xl">
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-app-text uppercase tracking-tighter">{champ.name}</h1>
          <p className="text-app-text-muted mt-2 font-medium">{champ.description || "Sem descrição disponível."}</p>
          
          <div className="flex flex-wrap gap-4 mt-4">
            <span className="text-[10px] text-app-text-muted font-black uppercase tracking-widest flex items-center bg-zinc-100 dark:bg-zinc-800/50 border border-app-border px-3 py-1.5 rounded-full">
              <Settings className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />
              {champ.format.replace('_', ' ')} {champ.isHomeAndAway ? '(Ida e Volta)' : '(Turno Único)'}
            </span>
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border",
              champ.status === 'rascunho' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-green-500/10 text-green-500 border-green-500/20"
            )}>
              {champ.status}
            </span>
          </div>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-4">
            {[
              { id: 'tabela', icon: TableIcon, label: 'Classificação' },
              { id: 'jogos', icon: Play, label: 'Jogos' },
              { id: 'times', icon: Users, label: 'Times' },
              { id: 'artilharia', icon: Award, label: 'Artilharia' },
              { id: 'cartoes', icon: ClipboardCheck, label: 'Cartões' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-app-text-muted border border-app-border'
                )}
              >
                <tab.icon className="w-3.5 h-3.5 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-app-card rounded-3xl border border-app-border p-8 shadow-sm">
        {activeTab === 'tabela' && (
          <div className="space-y-6">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black text-app-text uppercase tracking-tight">Classificação</h2>
                {champ.jogos.length === 0 && (
                   <button 
                     onClick={handleGenerateTable}
                     className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center shadow-lg hover:bg-green-700 transition"
                   >
                     <Play className="w-3.5 h-3.5 mr-2" />
                     Gerar Tabela
                   </button>
                )}
             </div>
             
             <div className="overflow-x-auto rounded-3xl border border-app-border bg-app-bg/20">
               <table className="w-full text-sm">
                  <thead className="bg-zinc-100 dark:bg-zinc-800/50 font-black text-app-text-muted uppercase text-[10px] tracking-widest">
                    <tr>
                      <th className="px-4 py-5 text-left">POS</th>
                      <th className="px-4 py-5 text-left">TIME</th>
                      <th className="px-4 py-5 text-center">PTS</th>
                      <th className="px-4 py-5 text-center">PJ</th>
                      <th className="px-4 py-5 text-center">V</th>
                      <th className="px-4 py-5 text-center">E</th>
                      <th className="px-4 py-5 text-center">D</th>
                      <th className="px-4 py-5 text-center">GP</th>
                      <th className="px-4 py-5 text-center">GC</th>
                      <th className="px-4 py-5 text-center">SG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {standings.map((team, idx) => (
                      <tr key={team.id} className="hover:bg-app-bg/30 transition-colors group">
                        <td className="px-4 py-5 font-black text-app-text-muted">{idx + 1}º</td>
                        <td className="px-4 py-5">
                          <div className="flex items-center gap-3">
                             <div className="w-2 h-2 rounded-full ring-2 ring-white dark:ring-zinc-900 shadow-sm" style={{ backgroundColor: team.cor || '#3b82f6' }}></div>
                             <span className="font-black text-app-text group-hover:text-blue-500 transition-colors uppercase tracking-tight ">{team.nome}</span>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center font-black text-blue-500 text-lg">{team.pts}</td>
                        <td className="px-4 py-5 text-center font-bold text-app-text-muted">{team.pj}</td>
                        <td className="px-4 py-5 text-center font-bold text-green-500">{team.v}</td>
                        <td className="px-4 py-5 text-center font-bold text-app-text-muted">{team.e}</td>
                        <td className="px-4 py-5 text-center font-bold text-red-500">{team.d}</td>
                        <td className="px-4 py-5 text-center font-bold text-app-text-muted">{team.gp}</td>
                        <td className="px-4 py-5 text-center font-bold text-app-text-muted">{team.gc}</td>
                        <td className={cn(
                          "px-4 py-5 text-center font-black",
                          team.sg > 0 ? "text-green-500" : team.sg < 0 ? "text-red-500" : "text-app-text-muted"
                        )}>
                          {team.sg}
                        </td>
                      </tr>
                    ))}
                    {standings.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-20 text-center text-app-text-muted italic">Nenhum dado de classificação disponível.</td>
                      </tr>
                    )}
                  </tbody>
               </table>
             </div>
          </div>
        )}

        {activeTab === 'jogos' && (
          <div className="space-y-6">
             <h2 className="text-xl font-black text-app-text uppercase tracking-tight">Jogos Gerados</h2>
             {champ.jogos.length === 0 ? (
                <div className="text-center py-20 bg-app-bg/30 rounded-3xl border-2 border-dashed border-app-border italic">
                   Gere a tabela para visualizar os jogos.
                </div>
             ) : (
                <div className="space-y-8">
                   {/* Group by rounds */}
                   {Array.from(new Set(champ.jogos.map(j => j.round))).sort((a, b) => a - b).map(round => (
                     <div key={round} className="space-y-4">
                        <div className="flex items-center gap-4">
                           <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest italic">Rodada {round}</span>
                           <div className="h-px flex-1 bg-app-border"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {champ.jogos.filter(j => j.round === round).map(game => (
                              <div key={game.id} className="bg-app-card border border-app-border rounded-2xl p-4 flex flex-col hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shadow-sm">
                                 <div className="flex items-center justify-between w-full">
                                    <div className="flex-1 text-right font-bold truncate text-xs uppercase tracking-tight flex items-center justify-end gap-2">
                                       {game.homeTeam.name}
                                       <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: game.homeTeam.color || '#3b82f6' }}></div>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-app-bg/50 rounded-xl border border-app-border mx-2">
                                       <span className="font-black text-lg w-6 text-center">{game.status === 'finalizado' ? game.homeScore : '-'}</span>
                                       <span className="text-[8px] text-zinc-500 font-black">VS</span>
                                       <span className="font-black text-lg w-6 text-center">{game.status === 'finalizado' ? game.awayScore : '-'}</span>
                                    </div>
                                    <div className="flex-1 text-left font-bold truncate text-xs uppercase tracking-tight flex items-center justify-start gap-2">
                                       <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: game.awayTeam.color || '#3b82f6' }}></div>
                                       {game.awayTeam.name}
                                    </div>
                                    <div className="flex items-center gap-1">
                                       <button 
                                          onClick={() => {
                                             setSelectedGameForSchedule(game);
                                             setScheduleDate(game.date ? new Date(game.date).toISOString().slice(0, 16) : "");
                                             setScheduleLocation(game.location || "");
                                             setShowScheduleModal(true);
                                          }}
                                          className="p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-500/10 rounded-lg transition"
                                          title="Agendar Partida"
                                       >
                                          <Calendar className="w-4 h-4" />
                                       </button>
                                       <button 
                                          onClick={() => {
                                             setSelectedGame(game);
                                             setHomeGoals(game.homeScore || 0);
                                             setAwayGoals(game.awayScore || 0);
                                             // Load existing events if any
                                             setGameEvents(game.eventos?.map((e: any) => ({
                                                type: e.type,
                                                playerId: e.playerId,
                                                playerName: e.player?.name || 'Jogador',
                                                teamId: e.teamId
                                             })) || []);
                                             setShowResultModal(true);
                                          }}
                                          className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition"
                                          title="Súmula Rápida"
                                       >
                                          <ClipboardCheck className="w-4 h-4" />
                                       </button>
                                       <Link 
                                          to={`/peladas/live/match-${game.id}`}
                                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition"
                                          title="Modo AO VIVO"
                                       >
                                          <Play className="w-4 h-4" />
                                       </Link>
                                    </div>
                                 </div>
                                 
                                 {(game.date || game.location) && (
                                    <div className="mt-3 pt-2 border-t border-app-border/40 flex items-center gap-4 text-[10px] font-semibold text-app-text-muted justify-center">
                                       {game.date && (
                                          <span className="flex items-center gap-1">
                                             <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                             {new Date(game.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                          </span>
                                       )}
                                       {game.location && (
                                          <span className="flex items-center gap-1">
                                             <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                                             {game.location}
                                          </span>
                                       )}
                                    </div>
                                 )}

                                 {game.status === 'finalizado' && game.eventos && game.eventos.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-app-border/40 space-y-2">
                                       <div className="text-[9px] font-black uppercase tracking-widest text-center text-app-text-muted">Boletim do Jogo</div>
                                       <div className="grid grid-cols-1 gap-1.5 bg-zinc-50 dark:bg-zinc-800/20 p-2.5 rounded-xl border border-app-border/40">
                                          {game.eventos.map((evt: any, eIdx: number) => (
                                             <div key={eIdx} className="flex justify-between items-center text-[11px] font-bold">
                                                <div className="flex items-center gap-2">
                                                   {evt.type === 'gol' && <span title="Gol" className="text-green-500">⚽</span>}
                                                   {evt.type === 'assistencia' && <span title="Assistência" className="text-blue-500">👟</span>}
                                                   {evt.type === 'cartao_amarelo' && <div className="w-1.5 h-2.5 bg-amber-400 rounded-sm border border-amber-600" title="Cartão Amarelo"></div>}
                                                   {evt.type === 'cartao_vermelho' && <div className="w-1.5 h-2.5 bg-red-600 rounded-sm border border-red-800" title="Cartão Vermelho"></div>}
                                                   <span className="text-app-text font-black uppercase text-[10px]">{evt.player?.name || evt.playerName || 'Jogador'}</span>
                                                </div>
                                                <span className="text-[8px] font-black uppercase tracking-wider text-app-text-muted bg-zinc-200/50 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded-md">
                                                   {evt.teamId === game.homeTeam.id ? 'Casa' : 'Visitante'}
                                                </span>
                                             </div>
                                          ))}
                                       </div>
                                    </div>
                                 )}
                              </div>
                           ))}
                        </div>
                     </div>
                   ))}
                </div>
             )}
          </div>
        )}

        {activeTab === 'times' && (
          <div className="space-y-6">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black text-app-text uppercase tracking-tight">Gestão de Times</h2>
                <button 
                  onClick={() => setShowAddTeamModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center shadow-lg hover:bg-blue-700 transition"
                >
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Time
                </button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {champ.times.map(team => (
                  <div key={team.id} className="bg-app-bg/30 border border-app-border rounded-3xl p-6 space-y-4">
                     <div className="flex justify-between items-center bg-zinc-100 dark:bg-zinc-800 p-3 rounded-2xl">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 flex items-center justify-center rounded-xl font-black text-xl text-white shadow-inner" style={{ backgroundColor: team.color || '#3b82f6' }}>
                              {team.name.charAt(0)}
                           </div>
                           <h3 className="font-black text-lg uppercase tracking-tight">{team.name}</h3>
                        </div>
                        <button onClick={() => handleDeleteTeam(team.id)} className="text-app-text-muted hover:text-red-500 transition p-2">
                           <Trash2 className="w-4 h-4" />
                        </button>
                     </div>

                     <div className="space-y-2">
                        <div className="flex justify-between items-center mb-1">
                           <span className="text-[10px] font-black text-app-text-muted uppercase tracking-widest pl-1">Jogadores ({team.jogadores.length})</span>
                           <button 
                             onClick={() => setSelectedTeamForPlayer(team.id)}
                             className="text-blue-500 hover:text-blue-600 transition flex items-center gap-1 text-[10px] font-black uppercase tracking-widest"
                           >
                              <UserPlus className="w-3 h-3" /> Adicionar
                           </button>
                        </div>
                        
                        <div className="divide-y divide-app-border border border-app-border rounded-2xl bg-app-card overflow-hidden">
                           {[...team.jogadores].sort((a, b) => (a.player.nome || a.player.name || "").localeCompare(b.player.nome || b.player.name || "")).map(jt => (
                              <div key={jt.id} className="flex justify-between items-center p-3 hover:bg-app-bg/20 group">
                                 <span 
                                    onClick={() => navigate(`/players/${jt.player.id}`)}
                                    className="text-sm font-bold text-app-text cursor-pointer hover:text-blue-500 transition-colors"
                                 >
                                    {jt.player.nome || jt.player.name}
                                 </span>
                                 <button onClick={() => handleRemovePlayer(jt.id)} className="text-zinc-600 dark:text-zinc-400 p-1 hover:text-red-500 transition">
                                    <X className="w-3.5 h-3.5" />
                                 </button>
                              </div>
                           ))}
                           {team.jogadores.length === 0 && (
                              <div className="p-4 text-center text-xs text-app-text-muted italic">Nenhum jogador escalado.</div>
                           )}
                        </div>
                     </div>
                  </div>
                ))}
                {champ.times.length === 0 && (
                   <div className="col-span-full py-20 text-center text-app-text-muted bg-app-bg/30 rounded-3xl border-2 border-dashed border-app-border italic">
                      Nenhum time cadastrado ainda. Comece adicionando um time!
                   </div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'artilharia' && (
           <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 {/* Scorers */}
                 <div className="space-y-6">
                    <h2 className="text-xl font-black text-app-text uppercase tracking-tight flex items-center gap-2">
                       <Award className="w-5 h-5 text-amber-500" /> Artilharia
                    </h2>
                    <div className="space-y-4">
                       {scorers.map((scorer, idx) => (
                          <div key={scorer.id} className="bg-app-bg/30 border border-app-border rounded-3xl p-6 flex items-center gap-5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shadow-sm group">
                             <div className="w-10 h-10 bg-amber-500/10 text-amber-500 flex items-center justify-center rounded-2xl font-black text-lg">
                                {idx + 1}º
                             </div>
                             <div className="flex-1 min-w-0">
                                <div 
                                   onClick={() => navigate(`/players/${scorer.id}`)}
                                   className="text-sm font-black text-app-text uppercase tracking-tight truncate cursor-pointer hover:text-amber-500"
                                >
                                   {scorer.nome}
                                </div>
                                <div className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">{scorer.time}</div>
                             </div>
                             <div className="text-xl font-black text-amber-500">{scorer.gols}</div>
                          </div>
                       ))}
                       {scorers.length === 0 && (
                          <div className="py-12 text-center text-app-text-muted italic border border-dashed border-app-border rounded-3xl">Nenhum gol.</div>
                       )}
                    </div>
                 </div>

                 {/* Assistances */}
                 <div className="space-y-6">
                    <h2 className="text-xl font-black text-app-text uppercase tracking-tight flex items-center gap-2">
                       <Trophy className="w-5 h-5 text-blue-500" /> Assistências
                    </h2>
                    <div className="space-y-4">
                       {assists.map((assist, idx) => (
                          <div key={assist.id} className="bg-app-bg/30 border border-app-border rounded-3xl p-6 flex items-center gap-5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shadow-sm group">
                             <div className="w-10 h-10 bg-blue-500/10 text-blue-500 flex items-center justify-center rounded-2xl font-black text-lg">
                                {idx + 1}º
                             </div>
                             <div className="flex-1 min-w-0">
                                <div 
                                   onClick={() => navigate(`/players/${assist.id}`)}
                                   className="text-sm font-black text-app-text uppercase tracking-tight truncate cursor-pointer hover:text-blue-500"
                                >
                                   {assist.nome}
                                </div>
                                <div className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">{assist.time}</div>
                             </div>
                             <div className="text-xl font-black text-blue-500">{assist.assistencias}</div>
                          </div>
                       ))}
                       {assists.length === 0 && (
                          <div className="py-12 text-center text-app-text-muted italic border border-dashed border-app-border rounded-3xl">Nenhuma assistência.</div>
                       )}
                    </div>
                 </div>
              </div>

               <button
                  onClick={() => setActiveTab('cartoes')}
                  className="w-full mt-4 flex items-center justify-center gap-2 text-app-text-muted hover:text-red-500 transition-all font-black text-[10px] uppercase tracking-widest py-4 border-t border-app-border"
               >
                  Ver Cartões e Suspensões <ChevronLeft className="w-3 h-3 rotate-180" />
               </button>
           </div>
        )}

        {activeTab === 'cartoes' && (
           <div className="space-y-8">
              <h2 className="text-xl font-black text-app-text uppercase tracking-tight flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-red-500" /> Cartões e Suspensões
              </h2>
              
              <div className="overflow-x-auto rounded-3xl border border-app-border bg-app-bg/20">
                 <table className="w-full text-sm">
                    <thead className="bg-zinc-100 dark:bg-zinc-800/50 font-black text-app-text-muted uppercase text-[10px] tracking-widest">
                       <tr>
                          <th className="px-6 py-5 text-left">JOGADOR</th>
                          <th className="px-6 py-5 text-left">TIME</th>
                          <th className="px-6 py-5 text-center">AMARELOS</th>
                          <th className="px-6 py-5 text-center">VERMELHOS</th>
                          <th className="px-6 py-5 text-center">STATUS</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                       {cards.map((c) => (
                          <tr key={c.id} className="hover:bg-app-bg/30 transition-colors">
                             <td 
                                onClick={() => navigate(`/players/${c.id}`)}
                                className="px-6 py-5 font-black text-app-text uppercase tracking-tight cursor-pointer hover:text-blue-500"
                             >
                                {c.nome}
                             </td>
                             <td className="px-6 py-5 font-bold text-app-text-muted uppercase text-xs">{c.time}</td>
                             <td className="px-6 py-5 text-center">
                                <span className="bg-amber-400 w-6 h-8 inline-block rounded shadow-sm text-black flex items-center justify-center font-black text-xs mx-auto">
                                   {c.amarelos}
                                </span>
                             </td>
                             <td className="px-6 py-5 text-center">
                                <span className="bg-red-600 w-6 h-8 inline-block rounded shadow-sm text-white flex items-center justify-center font-black text-xs mx-auto">
                                   {c.vermelhos}
                                </span>
                             </td>
                             <td className="px-6 py-5 text-center">
                                {c.suspenso ? (
                                   <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest italic">Suspenso</span>
                                ) : (
                                   <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest italic">Liberado</span>
                                )}
                             </td>
                          </tr>
                       ))}
                       {cards.length === 0 && (
                          <tr>
                             <td colSpan={5} className="py-20 text-center text-app-text-muted italic">Nenhum cartão registrado.</td>
                          </tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        )}
      </div>

      {/* Add Team Modal */}
      {showAddTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-app-card rounded-3xl p-8 max-w-sm w-full border border-app-border shadow-2xl">
              <h2 className="text-2xl font-black mb-6 text-app-text uppercase tracking-tighter">Novo Time</h2>
              <form onSubmit={handleAddTeam} className="space-y-4">
                 <div>
                    <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1 pl-1">Nome do Time</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: OS VINGADORES"
                      className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl outline-none text-app-text font-bold"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                    />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1 pl-1">Cor do Time</label>
                    <div className="flex flex-wrap gap-2 py-2">
                       {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#000000', '#ffffff'].map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewTeamColor(c)}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${newTeamColor === c ? 'scale-110 border-blue-500 shadow-md ring-2 ring-blue-500 ring-offset-2' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            style={{ backgroundColor: c }}
                          />
                       ))}
                       <input 
                          type="color" 
                          value={newTeamColor}
                          onChange={(e) => setNewTeamColor(e.target.value)}
                          className="w-8 h-8 rounded-full bg-transparent border-none cursor-pointer p-0"
                       />
                    </div>
                 </div>
                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setShowAddTeamModal(false)} className="flex-1 px-4 py-3 text-app-text-muted font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                    <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest">Confirmar</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Select Player Modal (Add to Team) */}
      {selectedTeamForPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-app-card rounded-3xl p-8 max-w-sm w-full border border-app-border shadow-2xl">
              <div className="flex justify-between items-start mb-1">
                <div>
                   <h2 className="text-xl font-black text-app-text uppercase tracking-tighter">Escalar Jogador</h2>
                   <p className="text-[10px] text-app-text-muted uppercase tracking-widest font-black">Adicione jogadores ao seu time</p>
                </div>
                <button 
                  onClick={() => {
                    setIsAddingNewPlayer(!isAddingNewPlayer);
                    setSelectedPlayerId("");
                    setNewPlayerName("");
                  }}
                  className="bg-blue-600/10 text-blue-500 p-2 rounded-xl hover:bg-blue-600/20 transition"
                  title={isAddingNewPlayer ? "Selecionar Existente" : "Cadastrar Novo"}
                >
                  {isAddingNewPlayer ? <Users className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-4 mt-6">
                 {isAddingNewPlayer ? (
                   <div>
                      <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1 pl-1">Nome do Novo Jogador</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl outline-none text-app-text font-bold"
                        placeholder="Nome completo"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        autoFocus
                      />
                   </div>
                 ) : (
                   <div>
                      <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1 pl-1">Selecione o Jogador</label>
                      <select
                        className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl outline-none text-app-text font-bold appearance-none cursor-pointer"
                        value={selectedPlayerId}
                        onChange={(e) => setSelectedPlayerId(e.target.value)}
                      >
                         <option value="">Selecione...</option>
                         {allPlayers.map(p => (
                            <option key={p.id} value={p.id}>{p.nome || p.name}</option>
                         ))}
                      </select>
                   </div>
                 )}
                 <div className="flex gap-4 pt-4">
                    <button onClick={() => {
                       setSelectedTeamForPlayer(null);
                       setIsAddingNewPlayer(false);
                    }} className="flex-1 px-4 py-3 text-app-text-muted font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                    <button 
                      onClick={() => isAddingNewPlayer ? handleCreateAndAddPlayer(selectedTeamForPlayer) : handleAddPlayer(selectedTeamForPlayer)} 
                      className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest"
                    >
                       {isAddingNewPlayer ? "Cadastrar" : "Escalar"}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Result Entry Modal */}
      {showResultModal && selectedGame && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-app-card rounded-[2.5rem] w-full max-w-2xl border border-app-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
               <div className="p-8 border-b border-app-border flex items-center justify-between">
                  <h2 className="text-2xl font-black text-app-text uppercase tracking-tighter">Súmula do Jogo</h2>
                  <button onClick={() => setShowResultModal(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition text-app-text-muted">
                    <X className="w-6 h-6" />
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  <div className="flex items-center justify-center gap-8 bg-zinc-100 dark:bg-zinc-800/50 p-8 rounded-[2rem] border border-app-border shadow-inner">
                    <div className="text-center flex-1 min-w-0">
                       <div className="text-xs font-black text-app-text uppercase tracking-tight truncate mb-3">{selectedGame.homeTeam.name}</div>
                       <input 
                         type="number" 
                         className="w-20 h-24 bg-white dark:bg-app-card border-2 border-app-border rounded-3xl text-center text-5xl font-black text-app-text focus:border-blue-500 outline-none transition-all"
                         value={homeGoals ?? 0}
                         onChange={(e) => setHomeGoals(parseInt(e.target.value) || 0)}
                       />
                    </div>
                    <div className="font-black text-3xl italic text-app-text-muted select-none">VS</div>
                    <div className="text-center flex-1 min-w-0">
                       <div className="text-xs font-black text-app-text uppercase tracking-tight truncate mb-3">{selectedGame.awayTeam.name}</div>
                       <input 
                         type="number" 
                         className="w-20 h-24 bg-white dark:bg-app-card border-2 border-app-border rounded-3xl text-center text-5xl font-black text-app-text focus:border-blue-500 outline-none transition-all"
                         value={awayGoals ?? 0}
                         onChange={(e) => setAwayGoals(parseInt(e.target.value) || 0)}
                       />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-center px-2">
                       <h3 className="text-xs font-black text-app-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                          <Plus className="w-3 h-3" /> Registrar Eventos
                       </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {/* Team A Events Entry */}
                       <div className="space-y-3">
                          <span className="text-[10px] font-black text-app-text-muted uppercase px-3">{selectedGame.homeTeam.name}</span>
                          <div className="flex gap-2">
                             <select id="playerA" className="flex-1 bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs font-bold outline-none">
                                <option value="">Jogador...</option>
                                {([...(champ.times.find(t => t.id === selectedGame.homeTeam.id)?.jogadores || [])]).sort((a, b) => (a.player.nome || a.player.name || "").localeCompare(b.player.nome || b.player.name || "")).map(jt => (
                                   <option key={jt.id} value={jt.player.id}>{jt.player.nome || jt.player.name}</option>
                                ))}
                             </select>
                             <button 
                                onClick={() => {
                                   const select = document.getElementById('playerA') as HTMLSelectElement;
                                   const pId = select.value;
                                   if (!pId) return;
                                   const pName = select.options[select.selectedIndex].text;
                                   setGameEvents([...gameEvents, { type: 'gol', playerId: pId, playerName: pName, teamId: selectedGame.homeTeam.id }]);
                                   setHomeGoals(prev => prev + 1);
                                   select.value = "";
                                }}
                                className="bg-green-600 text-white p-2 rounded-xl"
                                title="Registrar Gol"
                             >
                                <Award className="w-4 h-4" />
                             </button>
                             <button 
                                onClick={() => {
                                   const select = document.getElementById('playerA') as HTMLSelectElement;
                                   const pId = select.value;
                                   if (!pId) return;
                                   const pName = select.options[select.selectedIndex].text;
                                   setGameEvents([...gameEvents, { type: 'assistencia', playerId: pId, playerName: pName, teamId: selectedGame.homeTeam.id }]);
                                   select.value = "";
                                }}
                                className="bg-blue-500 text-white p-2 rounded-xl"
                                title="Assistência"
                             >
                                <Users className="w-4 h-4" />
                             </button>
                             <button 
                                onClick={() => {
                                   const select = document.getElementById('playerA') as HTMLSelectElement;
                                   const pId = select.value;
                                   if (!pId) return;
                                   const pName = select.options[select.selectedIndex].text;
                                   setGameEvents([...gameEvents, { type: 'cartao_amarelo', playerId: pId, playerName: pName, teamId: selectedGame.homeTeam.id }]);
                                   select.value = "";
                                }}
                                className="bg-amber-400 text-white p-2 rounded-xl"
                                title="Cartão Amarelo"
                             >
                                <div className="w-4 h-4 bg-amber-400 rounded-sm border border-amber-600"></div>
                             </button>
                             <button 
                                onClick={() => {
                                   const select = document.getElementById('playerA') as HTMLSelectElement;
                                   const pId = select.value;
                                   if (!pId) return;
                                   const pName = select.options[select.selectedIndex].text;
                                   setGameEvents([...gameEvents, { type: 'cartao_vermelho', playerId: pId, playerName: pName, teamId: selectedGame.homeTeam.id }]);
                                   select.value = "";
                                }}
                                className="bg-red-600 text-white p-2 rounded-xl"
                                title="Cartão Vermelho"
                             >
                                <div className="w-4 h-4 bg-red-600 rounded-sm border border-red-800"></div>
                             </button>
                          </div>
                       </div>

                       {/* Team B Events Entry */}
                       <div className="space-y-3">
                          <span className="text-[10px] font-black text-app-text-muted uppercase px-3">{selectedGame.awayTeam.name}</span>
                          <div className="flex gap-2">
                             <select id="playerB" className="flex-1 bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs font-bold outline-none">
                                <option value="">Jogador...</option>
                                {([...(champ.times.find(t => t.id === selectedGame.awayTeam.id)?.jogadores || [])]).sort((a, b) => (a.player.nome || a.player.name || "").localeCompare(b.player.nome || b.player.name || "")).map(jt => (
                                   <option key={jt.id} value={jt.player.id}>{jt.player.nome || jt.player.name}</option>
                                ))}
                             </select>
                             <button 
                                onClick={() => {
                                   const select = document.getElementById('playerB') as HTMLSelectElement;
                                   const pId = select.value;
                                   if (!pId) return;
                                   const pName = select.options[select.selectedIndex].text;
                                   setGameEvents([...gameEvents, { type: 'gol', playerId: pId, playerName: pName, teamId: selectedGame.awayTeam.id }]);
                                   setAwayGoals(prev => prev + 1);
                                   select.value = "";
                                }}
                                className="bg-green-600 text-white p-2 rounded-xl"
                                title="Registrar Gol"
                             >
                                <Award className="w-4 h-4" />
                             </button>
                             <button 
                                onClick={() => {
                                   const select = document.getElementById('playerB') as HTMLSelectElement;
                                   const pId = select.value;
                                   if (!pId) return;
                                   const pName = select.options[select.selectedIndex].text;
                                   setGameEvents([...gameEvents, { type: 'assistencia', playerId: pId, playerName: pName, teamId: selectedGame.awayTeam.id }]);
                                   select.value = "";
                                }}
                                className="bg-blue-500 text-white p-2 rounded-xl"
                                title="Assistência"
                             >
                                <Users className="w-4 h-4" />
                             </button>
                             <button 
                                onClick={() => {
                                   const select = document.getElementById('playerB') as HTMLSelectElement;
                                   const pId = select.value;
                                   if (!pId) return;
                                   const pName = select.options[select.selectedIndex].text;
                                   setGameEvents([...gameEvents, { type: 'cartao_amarelo', playerId: pId, playerName: pName, teamId: selectedGame.awayTeam.id }]);
                                   select.value = "";
                                }}
                                className="bg-amber-400 text-white p-2 rounded-xl"
                                title="Cartão Amarelo"
                             >
                                <div className="w-4 h-4 bg-amber-400 rounded-sm border border-amber-600"></div>
                             </button>
                             <button 
                                onClick={() => {
                                   const select = document.getElementById('playerB') as HTMLSelectElement;
                                   const pId = select.value;
                                   if (!pId) return;
                                   const pName = select.options[select.selectedIndex].text;
                                   setGameEvents([...gameEvents, { type: 'cartao_vermelho', playerId: pId, playerName: pName, teamId: selectedGame.awayTeam.id }]);
                                   select.value = "";
                                }}
                                className="bg-red-600 text-white p-2 rounded-xl"
                                title="Cartão Vermelho"
                             >
                                <div className="w-4 h-4 bg-red-600 rounded-sm border border-red-800"></div>
                             </button>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-2 mt-4 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
                       {gameEvents.map((event, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-zinc-100 dark:bg-zinc-900 border border-app-border px-4 py-3 rounded-2xl">
                             <div className="flex items-center gap-3">
                                {event.type === 'gol' && <Trophy className="w-3.5 h-3.5 text-green-500" />}
                                {event.type === 'assistencia' && <Users className="w-3.5 h-3.5 text-blue-500" />}
                                {event.type === 'cartao_amarelo' && <div className="w-3 h-4 bg-amber-400 rounded-sm border border-amber-600"></div>}
                                {event.type === 'cartao_vermelho' && <div className="w-3 h-4 bg-red-600 rounded-sm border border-red-800"></div>}
                                <span className="text-xs font-black uppercase tracking-tight italic">{event.playerName}</span>
                                <span className="text-[8px] font-black text-app-text-muted uppercase tracking-widest pl-2">
                                   {event.teamId === selectedGame.homeTeam.id ? selectedGame.homeTeam.name : selectedGame.awayTeam.name}
                                </span>
                             </div>
                             <button onClick={() => {
                                if (event.type === 'gol') {
                                   if (event.teamId === selectedGame.homeTeam.id) setHomeGoals(prev => Math.max(0, prev - 1));
                                   else setAwayGoals(prev => Math.max(0, prev - 1));
                                }
                                setGameEvents(prev => prev.filter((_, i) => i !== idx));
                             }} className="p-1 hover:text-red-500 transition">
                                <X className="w-4 h-4" />
                             </button>
                          </div>
                       ))}
                       {gameEvents.length === 0 && (
                          <div className="py-8 text-center text-[10px] font-black text-app-text-muted uppercase tracking-widest italic border-2 border-dashed border-app-border rounded-2xl">
                             Nenhum evento registrado ainda.
                          </div>
                       )}
                    </div>
                  </div>
               </div>

               <div className="p-8 border-t border-app-border">
                  <button 
                     onClick={handleUpdateMatch}
                     className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-2xl shadow-blue-900/30 hover:bg-blue-700 transition-all uppercase tracking-[0.2em]"
                  >
                     Finalizar Jogo e Súmula
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Schedule Edit Modal */}
      {showScheduleModal && selectedGameForSchedule && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-app-card rounded-[2rem] p-8 max-w-sm w-full border border-app-border shadow-2xl">
               <h2 className="text-xl font-black mb-1 text-app-text uppercase tracking-tighter">Agendar Partida</h2>
               <p className="text-[10px] text-app-text-muted uppercase tracking-widest font-black mb-6">Selecione data, hora e local do jogo</p>
               <div className="space-y-4">
                  <div>
                     <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1 pl-1">Data e Hora</label>
                     <input
                        type="datetime-local"
                        className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl outline-none text-app-text font-bold"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                     />
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1 pl-1">Local / Estádio</label>
                     <input
                        type="text"
                        placeholder="Ex: Campo Principal, Quadra B"
                        className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl outline-none text-app-text font-bold placeholder-app-text-muted/50"
                        value={scheduleLocation}
                        onChange={(e) => setScheduleLocation(e.target.value)}
                     />
                  </div>
                  <div className="flex gap-4 pt-4">
                     <button 
                        type="button" 
                        onClick={() => setShowScheduleModal(false)} 
                        className="flex-1 px-4 py-3 text-app-text-muted font-black uppercase text-[10px] tracking-widest"
                     >
                        Cancelar
                     </button>
                     <button 
                        type="button" 
                        onClick={handleSaveSchedule} 
                        className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition"
                     >
                        Salvar
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default ChampionshipDetail;
