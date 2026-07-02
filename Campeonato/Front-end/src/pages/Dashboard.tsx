import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Users, Trophy, Star,
  PlusCircle, ChevronRight, Loader2, Shield,
} from "lucide-react";
import api from "../services/api";
import { cn } from "../lib/utils";

interface PlayerSummary { id: string; nome: string; nivel_estrelas: number; ativo: boolean; }
interface TeamSummary   { id: string; nome: string; escudo: string; escudo_url: string; cor: string; total_jogadores: number; }

const TeamAvatar = ({ team, size = 10 }: { team: Pick<TeamSummary, "nome" | "escudo" | "escudo_url" | "cor">; size?: number }) => {
  const src = team.escudo || team.escudo_url;
  const s = `w-${size} h-${size}`;
  if (src) return <img src={src} alt={team.nome} className={`${s} rounded-xl object-cover border border-app-border shrink-0`} />;
  return (
    <div className={`${s} rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0`}
      style={{ backgroundColor: team.cor || "#3b82f6" }}>
      {team.nome.charAt(0).toUpperCase()}
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [players,   setPlayers]  = useState<PlayerSummary[]>([]);
  const [teams,     setTeams]    = useState<TeamSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/jogadores/"),
      api.get("/times/"),
    ]).then(([pRes, tRes]) => {
      setPlayers(Array.isArray(pRes.data) ? pRes.data : []);
      setTeams(Array.isArray(tRes.data) ? tRes.data : []);
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin h-12 w-12 text-blue-600" />
      </div>
    );
  }

  const ativos   = players.filter(p => p.ativo).length;
  const nivelMed = players.length
    ? (players.reduce((s, p) => s + p.nivel_estrelas, 0) / players.length).toFixed(1)
    : "—";

  const stats = [
    { name: "Meus Jogadores",   value: players.length, icon: Users,  color: "text-green-500",  bg: "bg-green-500/10"  },
    { name: "Jogadores Ativos", value: ativos,          icon: Users,  color: "text-blue-500",   bg: "bg-blue-500/10"   },
    { name: "Meus Times",       value: teams.length,    icon: Shield, color: "text-purple-500", bg: "bg-purple-500/10" },
    { name: "Nível Médio",      value: nivelMed,        icon: Star,   color: "text-amber-500",  bg: "bg-amber-500/10"  },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-app-border pb-6">
        <div>
          <h1 className="text-3xl font-bold text-app-text tracking-tight">Dashboard</h1>
          <p className="text-app-text-muted italic font-serif text-sm">Bem-vindo, {user?.name}.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/players"
            className="inline-flex items-center px-4 py-2 border border-app-border rounded-md text-sm font-medium text-app-text bg-app-card hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shadow-sm">
            <Users className="mr-2 h-4 w-4" /> Jogadores
          </Link>
          <Link to="/championships"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-amber-600 hover:bg-amber-500 transition-all shadow-sm">
            <Trophy className="mr-2 h-4 w-4" /> Meus Campeonatos
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-app-border rounded-lg overflow-hidden shadow-sm">
        {stats.map((stat, i) => (
          <div key={stat.name}
            className={cn("bg-app-card p-6 border-app-border hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group",
              i < stats.length - 1 && "border-r", "border-b sm:border-b-0")}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold text-app-text-muted uppercase tracking-widest font-mono">{stat.name}</p>
              <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-app-text font-mono tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Meus Times */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-app-text uppercase tracking-tight flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-500" /> Meus Times
            </h2>
            <Link to="/teams" className="text-sm text-purple-500 hover:underline flex items-center">
              Ver todos <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="bg-app-card border border-app-border rounded-lg overflow-hidden shadow-sm">
            {teams.length > 0 ? (
              teams.slice(0, 5).map((team, i) => (
                <div key={team.id}
                  onClick={() => navigate('/teams')}
                  className={cn(
                    "flex items-center gap-4 px-5 py-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer",
                    i < Math.min(teams.length, 5) - 1 && "border-b border-app-border"
                  )}>
                  <TeamAvatar team={team} size={10} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-app-text truncate uppercase tracking-tight">{team.nome}</p>
                    <p className="text-xs text-app-text-muted">{team.total_jogadores} jogador{team.total_jogadores !== 1 ? "es" : ""}</p>
                  </div>
                  {team.cor && (
                    <div className="w-3 h-3 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: team.cor }} />
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-app-text-muted italic font-serif space-y-3">
                <Shield className="w-10 h-10 mx-auto opacity-20" />
                <p>Nenhum time cadastrado.</p>
                <Link to="/teams"
                  className="inline-flex items-center gap-1.5 text-sm text-purple-500 font-bold hover:underline">
                  <PlusCircle className="w-4 h-4" /> Criar time
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Meus Jogadores */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-app-text uppercase tracking-tight flex items-center gap-2">
              <Users className="w-4 h-4 text-green-500" /> Meus Jogadores
            </h2>
            <Link to="/players" className="text-sm text-green-500 hover:underline flex items-center">
              Ver todos <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="bg-app-card border border-app-border rounded-lg overflow-hidden shadow-sm">
            {players.length > 0 ? (
              players.slice(0, 5).map((player, i) => (
                <div key={player.id}
                  onClick={() => navigate(`/players/${player.id}`)}
                  className={cn(
                    "flex items-center gap-4 px-5 py-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer",
                    i < Math.min(players.length, 5) - 1 && "border-b border-app-border"
                  )}>
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border shrink-0",
                    player.ativo
                      ? "bg-green-500/20 text-green-500 border-green-500/20"
                      : "bg-zinc-500/20 text-zinc-400 border-zinc-500/20"
                  )}>
                    {player.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-app-text truncate">{player.nome}</p>
                    <div className="flex items-center gap-1 text-xs text-amber-500">
                      <Star className="w-3 h-3 fill-current" />
                      <span className="font-semibold">{player.nivel_estrelas.toFixed(1)}</span>
                    </div>
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                    player.ativo ? "bg-green-500/20 text-green-400" : "bg-zinc-500/20 text-zinc-400"
                  )}>
                    {player.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-app-text-muted italic font-serif space-y-3">
                <Users className="w-10 h-10 mx-auto opacity-20" />
                <p>Nenhum jogador cadastrado.</p>
                <Link to="/players"
                  className="inline-flex items-center gap-1.5 text-sm text-green-500 font-bold hover:underline">
                  <PlusCircle className="w-4 h-4" /> Adicionar jogador
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
