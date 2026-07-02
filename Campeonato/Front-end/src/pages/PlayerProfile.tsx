import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { 
  ChevronLeft, 
  Loader2, 
  Trophy, 
  Target, 
  Handshake, 
  Percent,
  Star,
  Award,
  Zap,
  TrendingUp
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../services/api";
import DataService, { Player, PlayerStats } from "../services/dataService";

const PlayerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayer();
  }, [id]);

  const fetchPlayer = async () => {
    if (!id) return;
    setLoading(true);

    // If it's a local player, load from localStorage first
    const localP = DataService.getPlayerById(id);
    if (localP) {
      const localS = DataService.getPlayerStats(id);
      setPlayer(localP);
      setStats(localS);
      setLoading(false);
      return;
    }

    try {
      // Try backend first
      const resp = await api.get(`/jogadores/${id}`);
      if (resp.data) {
        const backendPlayer = resp.data;
        const mappedPlayer: Player = {
          id: backendPlayer.id,
          nome: backendPlayer.nome || backendPlayer.name,
          nivel_estrelas: Number(backendPlayer.nivel_estrelas || backendPlayer.stars || 3.0),
          ativo: backendPlayer.ativo !== undefined ? backendPlayer.ativo : true,
          data_cadastro: backendPlayer.data_cadastro || backendPlayer.createdAt
        };
        const backendStats = backendPlayer.estatisticas || {};
        const mappedStats: PlayerStats = {
          id: id,
          playerId: id,
          goals: backendStats.total_gols ?? backendStats.goals ?? 0,
          assists: backendStats.total_assistencias ?? backendStats.assists ?? 0,
          wins: backendStats.total_vitorias ?? backendStats.wins ?? 0,
          draws: backendStats.total_empates ?? backendStats.draws ?? 0,
          losses: backendStats.total_derrotas ?? backendStats.losses ?? 0,
          matchesPlayed: backendStats.total_jogos ?? backendStats.matchesPlayed ?? 0,
          yellowCards: backendStats.yellowCards ?? 0,
          redCards: backendStats.redCards ?? 0
        };
        setPlayer(mappedPlayer);
        setStats(mappedStats);
        setLoading(false);
        return;
      }
    } catch (apiError) {
      console.log("Using local offline fallback for player profile:", apiError);
    }

    try {
      toast.error("Jogador não encontrado.");
    } catch (error) {
      toast.error("Erro ao carregar perfil do jogador.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-64 space-y-4">
      <Loader2 className="animate-spin text-green-500 h-8 w-8" />
      <p className="text-app-text-muted italic">Carregando perfil...</p>
    </div>
  );

  if (!player) return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="text-app-text-muted text-lg italic">Jogador não encontrado.</div>
      <button 
        onClick={() => navigate("/players")}
        className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition"
      >
        Voltar para Jogadores
      </button>
    </div>
  );

  const displayStats = stats || {
    matchesPlayed: 0,
    goals: 0,
    assists: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    yellowCards: 0,
    redCards: 0
  };

  const winRate = displayStats.matchesPlayed > 0 ? ((displayStats.wins / displayStats.matchesPlayed) * 100).toFixed(0) : 0;
  const mediaGols = displayStats.matchesPlayed > 0 ? (displayStats.goals / displayStats.matchesPlayed).toFixed(2) : "0.00";

  return (
    <div className="space-y-8 pb-20 max-w-4xl mx-auto">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-app-text-muted hover:text-green-500 transition font-bold"
      >
        <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
      </button>

      {/* Header Profile */}
      <div className="bg-app-card rounded-3xl p-8 shadow-sm border border-app-border flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
           <Trophy className="w-32 h-32 text-app-text" />
        </div>
        
        <div className="w-32 h-32 bg-app-bg rounded-full flex items-center justify-center text-blue-400 text-4xl font-black border-4 border-app-card shadow-2xl">
          {player.nome.charAt(0).toUpperCase()}
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-black text-app-text mb-1 uppercase tracking-tight">{player.nome}</h1>
          <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2">
            <span className="flex items-center bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-yellow-500/20">
              <Star className="w-4 h-4 mr-1 fill-current" />
              Nível {player.nivel_estrelas.toFixed(1)}
            </span>
            <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-blue-500/20">
              {displayStats.matchesPlayed} Jogos
            </span>
          </div>
        </div>

        <div className="bg-green-500/10 p-6 rounded-2xl text-center min-w-[140px] border border-green-500/20 shadow-inner">
          <div className="text-3xl font-black text-green-500">{winRate}%</div>
          <div className="text-[10px] font-black text-green-600 uppercase tracking-widest mt-1">Vitórias</div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Gols", value: displayStats.goals, icon: Target, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Assis.", value: displayStats.assists, icon: Handshake, color: "text-purple-400", bg: "bg-purple-500/10" },
          { label: "Média", value: mediaGols, icon: TrendingUp, color: "text-orange-400", bg: "bg-orange-500/10" },
          { label: "Cartões", value: displayStats.yellowCards + displayStats.redCards, icon: Award, color: "text-red-400", bg: "bg-red-500/10" },
        ].map((item, idx) => (
          <div key={idx} className="bg-app-card p-6 rounded-2xl border border-app-border text-center group hover:bg-zinc-100 dark:hover:bg-zinc-800/45 transition-colors">
            <div className={cn("w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-3 shadow-inner", item.bg, item.color)}>
              <item.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-black text-app-text group-hover:scale-110 transition-transform">{item.value}</div>
            <div className="text-[10px] font-black text-app-text-muted uppercase tracking-widest mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Wins/Losses / Retrospecto */}
        <div className="bg-app-card rounded-3xl p-8 border border-app-border shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-app-text mb-6 flex items-center uppercase tracking-tight">
              <Zap className="w-5 h-5 mr-2 text-blue-400 fill-current" />
              Retrospecto de Partidas
            </h2>
            
            <p className="text-xs text-app-text-muted mb-6 leading-relaxed">
              Resumo geral de partidas do jogador nos campeonatos.
            </p>

            <div className="flex gap-1 h-4 w-full bg-app-bg rounded-full overflow-hidden mb-8 shadow-inner border border-app-border">
              <div 
                style={{ width: `${displayStats.matchesPlayed > 0 ? (displayStats.wins / displayStats.matchesPlayed) * 100 : 0}%` }} 
                className="bg-green-500 shadow-lg shadow-green-500/30"
                title="Vitórias"
              ></div>
              <div 
                style={{ width: `${displayStats.matchesPlayed > 0 ? (displayStats.draws / displayStats.matchesPlayed) * 100 : 0}%` }} 
                className="bg-zinc-500"
                title="Empates"
              ></div>
              <div 
                style={{ width: `${displayStats.matchesPlayed > 0 ? (displayStats.losses / displayStats.matchesPlayed) * 100 : 0}%` }} 
                className="bg-red-500 shadow-lg shadow-red-500/30"
                title="Derrotas"
              ></div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-4">
              <div className="text-center bg-app-bg p-4 rounded-2xl border border-app-border/50">
                <div className="text-3xl font-black text-green-500">{displayStats.wins}</div>
                <div className="text-[9px] font-black text-app-text-muted uppercase tracking-widest mt-1">Vitórias</div>
              </div>
              <div className="text-center bg-app-bg p-4 rounded-2xl border border-app-border/50">
                <div className="text-3xl font-black text-app-text">{displayStats.draws}</div>
                <div className="text-[9px] font-black text-app-text-muted uppercase tracking-widest mt-1">Empates</div>
              </div>
              <div className="text-center bg-app-bg p-4 rounded-2xl border border-app-border/50">
                <div className="text-3xl font-black text-red-500">{displayStats.losses}</div>
                <div className="text-[9px] font-black text-app-text-muted uppercase tracking-widest mt-1">Derrotas</div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-app-border/40 text-center">
            <span className="text-xs font-medium text-app-text-muted">
              Total de <strong className="text-app-text font-black">{displayStats.matchesPlayed}</strong> partidas disputadas.
            </span>
          </div>
        </div>

        {/* Dynamic Radar Attributes Chart */}
        <div className="bg-app-card rounded-3xl p-8 border border-app-border shadow-sm flex flex-col items-center">
          <div className="w-full text-left">
            <h2 className="text-xl font-bold text-app-text mb-2 flex items-center uppercase tracking-tight">
              <Award className="w-5 h-5 mr-2 text-yellow-500 fill-current" />
              Gráfico de Desempenho
            </h2>
            <p className="text-xs text-app-text-muted mb-6">
              Métricas dinamarquesas de atributos de campo calculadas com base nas suas estatísticas de gols, assistências, conduta e nível.
            </p>
          </div>

          {/* SVG PENTAGON RENDERING */}
          {(() => {
            const ratings = [
              { label: "ATA", value: Math.min(100, Math.max(15, Math.round(displayStats.matchesPlayed > 0 ? (displayStats.goals / Math.max(1, displayStats.matchesPlayed)) * 120 + 20 : 30))) },
              { label: "VIS", value: Math.min(100, Math.max(15, Math.round(displayStats.matchesPlayed > 0 ? (displayStats.assists / Math.max(1, displayStats.matchesPlayed)) * 120 + 20 : 30))) },
              { label: "VIT", value: Math.min(100, Math.max(15, Math.round(displayStats.matchesPlayed > 0 ? (displayStats.wins / displayStats.matchesPlayed) * 100 : 30))) },
              { label: "DIS", value: Math.max(15, 100 - (displayStats.yellowCards * 15 + displayStats.redCards * 35)) },
              { label: "NIV", value: Math.round(player.nivel_estrelas * 20) }
            ];

            const getPoint = (i: number, val: number) => {
              const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
              const r = (val / 100) * 85; // cap radius at 85 to leave space for text
              return {
                x: 150 + r * Math.cos(angle),
                y: 140 + r * Math.sin(angle)
              };
            };

            const pointsStr = ratings.map((r, i) => {
              const pt = getPoint(i, r.value);
              return `${pt.x},${pt.y}`;
            }).join(" ");

            return (
              <div className="relative w-full flex justify-center py-2">
                <svg viewBox="0 0 300 280" className="w-full max-w-[280px]">
                  {/* Pentagonal grids */}
                  {[20, 40, 60, 80, 100].map((gridVal) => {
                    const gridPoints = ratings.map((_, i) => {
                      const pt = getPoint(i, gridVal);
                      return `${pt.x},${pt.y}`;
                    }).join(" ");
                    return (
                      <polygon
                        key={gridVal}
                        points={gridPoints}
                        fill="none"
                        className="stroke-zinc-800 dark:stroke-zinc-700/50"
                        strokeWidth="1"
                        strokeDasharray={gridVal === 100 ? "0" : "2"}
                      />
                    );
                  })}

                  {/* Axis lines */}
                  {ratings.map((_, i) => {
                    const outerPt = getPoint(i, 100);
                    return (
                      <line
                        key={i}
                        x1="150"
                        y1="140"
                        x2={outerPt.x}
                        y2={outerPt.y}
                        className="stroke-zinc-800 dark:stroke-zinc-700/50"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {/* Filled Performance Polygon */}
                  <polygon
                    points={pointsStr}
                    className="fill-green-500/20 stroke-green-500"
                    strokeWidth="2.5"
                  />

                  {/* Stat dots */}
                  {ratings.map((r, i) => {
                    const pt = getPoint(i, r.value);
                    return (
                      <circle
                        key={i}
                        cx={pt.x}
                        cy={pt.y}
                        r="4.5"
                        className="fill-green-500 stroke-app-card"
                        strokeWidth="1.5"
                      />
                    );
                  })}

                  {/* Labels and values */}
                  {ratings.map((r, i) => {
                    const labelPt = getPoint(i, 118); // offset labels slightly further out
                    const align = i === 0 ? "middle" : i === 3 ? "start" : i === 4 ? "end" : i === 1 ? "start" : "end";
                    const dy = i === 0 ? "-2" : i === 3 || i === 2 ? "12" : "2";

                    return (
                      <g key={i}>
                        <text
                          x={labelPt.x}
                          y={labelPt.y}
                          textAnchor={align}
                          dy={dy}
                          className="fill-app-text-muted text-[10px] font-black uppercase tracking-wider font-sans"
                        >
                          {r.label}
                        </text>
                        <text
                          x={labelPt.x}
                          y={labelPt.y + 11}
                          textAnchor={align}
                          dy={dy}
                          className="fill-green-500 text-[10px] font-black font-mono"
                        >
                          {r.value}%
                        </text>
                      </g>
                    );
                  })}
                </svg>

                <div className="absolute bottom-[-10px] left-0 right-0 flex justify-center gap-4 text-[9px] font-black text-app-text-muted uppercase tracking-widest">
                  <span>ATA = ATAQUE</span>
                  <span>VIS = VISÃO</span>
                  <span>VIT = VITÓRIA</span>
                  <span>DIS = DISCIPLINA</span>
                  <span>NIV = NÍVEL</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;
