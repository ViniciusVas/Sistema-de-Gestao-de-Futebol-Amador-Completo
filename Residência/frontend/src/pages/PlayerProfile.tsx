import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Award,
  Calendar,
  ChevronLeft,
  Info,
  Shield,
  Star,
  Target,
  Trophy,
  TrendingUp,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "react-hot-toast";
import api from "../services/api";

interface Player {
  id: number;
  nome: string;
  nivel_estrelas: number;
  ativo: boolean;
  dataCadastro?: string;
  data_cadastro?: string;
  createdAt?: string;
}

interface PlayerStats {
  total_jogos: number;
  total_gols: number;
  total_assistencias: number;
  total_vitorias: number;
  total_empates: number;
  total_derrotas: number;
  media_gols: number;
}

const defaultStats: PlayerStats = {
  total_jogos: 0,
  total_gols: 0,
  total_assistencias: 0,
  total_vitorias: 0,
  total_empates: 0,
  total_derrotas: 0,
  media_gols: 0,
};

const PlayerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerStats>(defaultStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayerData();
  }, [id]);

  const getErrorMessage = (error: any, fallback: string) => {
    return (
      error?.response?.data?.erro ||
      error?.response?.data?.error ||
      error?.response?.data?.mensagem ||
      fallback
    );
  };

  const toNumber = (value: unknown, fallback = 0) => {
    const numberValue = Number(value);

    return Number.isFinite(numberValue) ? numberValue : fallback;
  };

  const normalizeStats = (data: any): PlayerStats => {
    /*
      A rota pode retornar os dados diretamente ou dentro de uma propriedade.
      Também são aceitos formatos camelCase e snake_case.
    */
    const estatisticas =
      data?.estatisticasPelada ??
      data?.estatisticas ??
      data?.statistics ??
      data?.data ??
      data ??
      {};

    const totalJogos = toNumber(
      estatisticas.totalJogos ??
        estatisticas.total_jogos ??
        estatisticas.jogos ??
        estatisticas.partidas
    );

    const totalGols = toNumber(
      estatisticas.totalGols ??
        estatisticas.total_gols ??
        estatisticas.gols
    );

    const totalAssistencias = toNumber(
      estatisticas.totalAssistencias ??
        estatisticas.total_assistencias ??
        estatisticas.assistencias
    );

    const totalVitorias = toNumber(
      estatisticas.totalVitorias ??
        estatisticas.total_vitorias ??
        estatisticas.vitorias
    );

    const totalEmpates = toNumber(
      estatisticas.totalEmpates ??
        estatisticas.total_empates ??
        estatisticas.empates
    );

    const totalDerrotas = toNumber(
      estatisticas.totalDerrotas ??
        estatisticas.total_derrotas ??
        estatisticas.derrotas
    );

    const mediaGolsRecebida = toNumber(
      estatisticas.mediaGols ?? estatisticas.media_gols
    );

    return {
      total_jogos:
        totalJogos || totalVitorias + totalEmpates + totalDerrotas,
      total_gols: totalGols,
      total_assistencias: totalAssistencias,
      total_vitorias: totalVitorias,
      total_empates: totalEmpates,
      total_derrotas: totalDerrotas,
      media_gols:
        totalJogos > 0
          ? mediaGolsRecebida > 0
            ? mediaGolsRecebida
            : totalGols / totalJogos
          : 0,
    };
  };

  const fetchPlayerData = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [playersResult, statsResult] = await Promise.allSettled([
        api.get("/jogadores"),
        api.get(`/jogadores/${id}/estatisticas`),
      ]);

      if (playersResult.status === "rejected") {
        throw playersResult.reason;
      }

      const players = Array.isArray(playersResult.value.data)
        ? playersResult.value.data
        : [];

      const foundPlayer = players.find(
        (item: Player) => Number(item.id) === Number(id)
      );

      if (!foundPlayer) {
        toast.error("Jogador não encontrado.");
        navigate("/players");
        return;
      }

      setPlayer(foundPlayer);

      if (statsResult.status === "fulfilled") {
        setStats(normalizeStats(statsResult.value.data));
      } else {
        /*
          O perfil ainda abre normalmente se o jogador não tiver estatísticas
          ou se a rota de estatísticas estiver temporariamente indisponível.
        */
        console.warn(
          "Não foi possível carregar as estatísticas do jogador:",
          statsResult.reason
        );

        setStats(defaultStats);
      }
    } catch (error) {
      console.error("Erro ao carregar perfil do jogador:", error);

      toast.error(
        getErrorMessage(error, "Erro ao carregar perfil do jogador.")
      );

      navigate("/players");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value?: string) => {
    if (!value) {
      return "Não informado";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Não informado";
    }

    return date.toLocaleDateString("pt-BR");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500" />
      </div>
    );
  }

  if (!player) {
    return null;
  }

  const playerLevel = Number(player.nivel_estrelas || 0);
  const totalJogos = Number(stats.total_jogos || 0);

  const winRate =
    totalJogos > 0
      ? ((Number(stats.total_vitorias) / totalJogos) * 100).toFixed(1)
      : "0";

  const tecnicRating = Math.min(playerLevel / 5, 1);

  const attackRating =
    totalJogos > 0
      ? Math.min(Number(stats.total_gols) / totalJogos / 1.5, 1)
      : 0;

  const playmakeRating =
    totalJogos > 0
      ? Math.min(Number(stats.total_assistencias) / totalJogos, 1)
      : 0;

  const decisionRating =
    totalJogos > 0 ? Number(stats.total_vitorias) / totalJogos : 0;

  const experienceRating = Math.min(totalJogos / 20, 1);

  const ratings = [
    { label: "Técnica", value: tecnicRating },
    { label: "Pontaria", value: attackRating },
    { label: "Coletividade", value: playmakeRating },
    { label: "Decisão", value: decisionRating },
    { label: "Resistência", value: experienceRating },
  ];

  const cx = 100;
  const cy = 100;
  const r = 70;
  const webs = [0.2, 0.4, 0.6, 0.8, 1];

  const getCoordinates = (index: number, scale: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 5;

    return {
      x: cx + r * scale * Math.cos(angle),
      y: cy + r * scale * Math.sin(angle),
    };
  };

  const getArchetype = () => {
    if (totalJogos === 0) {
      return {
        title: "Recruta",
        desc: "Ainda não estreou nas partidas registradas. Participe de uma pelada e encerre um confronto para gerar estatísticas.",
      };
    }

    if (attackRating >= 0.7 && attackRating >= playmakeRating) {
      return {
        title: "Artilheiro Clínico",
        desc: "Um verdadeiro perigo na área. Finaliza com precisão e aparece com frequência nas estatísticas de gols.",
      };
    }

    if (playmakeRating >= 0.7 && playmakeRating >= attackRating) {
      return {
        title: "Arquiteto do Jogo",
        desc: "Tem boa participação coletiva e costuma contribuir com assistências para os companheiros.",
      };
    }

    if (decisionRating >= 0.7) {
      return {
        title: "Amuleto da Vitória",
        desc: "Tem ótimo aproveitamento. Quando participa, costuma sair de quadra com bons resultados.",
      };
    }

    if (experienceRating >= 0.8) {
      return {
        title: "Lenda das Quadras",
        desc: "Jogador experiente, com boa quantidade de partidas registradas no sistema.",
      };
    }

    return {
      title: "Jogador Equilibrado",
      desc: "Perfil polivalente, com desempenho equilibrado entre técnica, participação e experiência.",
    };
  };

  const archetype = getArchetype();

  const cadastro =
    player.data_cadastro || player.dataCadastro || player.createdAt || "";

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 md:px-0">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate(-1)}
          className="bg-app-card p-2 rounded-xl text-app-text-muted flex items-center hover:text-green-500 transition font-bold border border-app-border shadow-sm group"
        >
          <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
          Voltar
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-app-text-muted">
            Perfil do Atleta
          </span>

          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-app-card rounded-[2.5rem] p-8 border border-app-border shadow-xl mb-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Trophy className="w-40 h-40" />
        </div>

        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative">
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-white text-4xl font-black shadow-2xl">
              {player.nome.charAt(0).toUpperCase()}
            </div>

            <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-white p-2 rounded-xl shadow-lg border-2 border-app-card">
              <Star className="w-5 h-5 fill-current" />
            </div>
          </div>

          <div className="text-center md:text-left flex-1">
            <h1 className="text-4xl font-black text-app-text uppercase tracking-tighter mb-2">
              {player.nome}
            </h1>

            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <div className="flex items-center px-4 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-black text-app-text-muted uppercase tracking-wider">
                <Star className="w-3.5 h-3.5 mr-1.5 text-yellow-500 fill-current" />
                {playerLevel.toFixed(1)} Nível
              </div>

              <div className="flex items-center px-4 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-black text-app-text-muted uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                Desde {formatDate(cadastro)}
              </div>

              {player.ativo ? (
                <div className="flex items-center px-4 py-1.5 bg-green-500/10 rounded-full text-[10px] font-black text-green-500 uppercase tracking-widest">
                  Ativo
                </div>
              ) : (
                <div className="flex items-center px-4 py-1.5 bg-red-500/10 rounded-full text-[10px] font-black text-red-500 uppercase tracking-widest">
                  Inativo
                </div>
              )}
            </div>
          </div>

          <div className="hidden lg:block bg-zinc-100 dark:bg-zinc-800/50 p-6 rounded-3xl border border-app-border">
            <div className="text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">
              Win Rate
            </div>

            <div className="text-3xl font-black text-green-500 tracking-tighter">
              {winRate}%
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={TrendingUp}
          label="Jogos"
          value={stats.total_jogos}
          color="blue"
          delay={0.1}
        />

        <StatCard
          icon={Target}
          label="Gols"
          value={stats.total_gols}
          color="green"
          delay={0.2}
        />

        <StatCard
          icon={Zap}
          label="Assist."
          value={stats.total_assistencias}
          color="orange"
          delay={0.3}
        />

        <StatCard
          icon={Award}
          label="Média Gols"
          value={Number(stats.media_gols || 0).toFixed(2)}
          color="purple"
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-app-card rounded-[2.5rem] p-8 border border-app-border shadow-lg"
        >
          <h2 className="text-xl font-black text-app-text uppercase tracking-tighter mb-6 flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
            Histórico de Partidas
          </h2>

          <div className="space-y-6">
            <ResultBar
              label="Vitórias"
              count={stats.total_vitorias}
              total={stats.total_jogos}
              color="bg-green-500"
            />

            <ResultBar
              label="Empates"
              count={stats.total_empates}
              total={stats.total_jogos}
              color="bg-blue-500"
            />

            <ResultBar
              label="Derrotas"
              count={stats.total_derrotas}
              total={stats.total_jogos}
              color="bg-red-500"
            />
          </div>

          <div className="mt-8 pt-8 border-t border-app-border flex justify-between items-center">
            <div className="text-center">
              <div className="text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">
                Aproveitamento
              </div>

              <div className="text-2xl font-black text-app-text tracking-tighter">
                {winRate}%
              </div>
            </div>

            <div className="h-10 w-px bg-app-border" />

            <div className="text-center">
              <div className="text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1">
                Participações
              </div>

              <div className="text-2xl font-black text-app-text tracking-tighter">
                {Number(stats.total_gols) + Number(stats.total_assistencias)}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-app-card rounded-[2.5rem] p-8 border border-app-border shadow-lg flex flex-col md:flex-row items-center gap-6"
        >
          <div className="relative w-44 h-44 flex items-center justify-center mx-auto md:mx-0">
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full overflow-visible"
            >
              {webs.map((w, index) => {
                const points = Array.from({ length: 5 }, (_, i) =>
                  getCoordinates(i, w)
                );

                const pointsStr = points
                  .map((point) => `${point.x},${point.y}`)
                  .join(" ");

                return (
                  <polygon
                    key={index}
                    points={pointsStr}
                    fill="none"
                    stroke="currentColor"
                    className="text-app-border"
                    strokeWidth="1"
                    strokeDasharray={index === 4 ? "0" : "2"}
                  />
                );
              })}

              {Array.from({ length: 5 }).map((_, index) => {
                const { x, y } = getCoordinates(index, 1);

                return (
                  <line
                    key={index}
                    x1={cx}
                    y1={cy}
                    x2={x}
                    y2={y}
                    stroke="currentColor"
                    className="text-app-border/40"
                    strokeWidth="1"
                  />
                );
              })}

              {(() => {
                const points = ratings.map((rating, index) =>
                  getCoordinates(index, rating.value)
                );

                const pointsStr = points
                  .map((point) => `${point.x},${point.y}`)
                  .join(" ");

                return (
                  <polygon
                    points={pointsStr}
                    fill="rgba(34, 197, 94, 0.2)"
                    stroke="#22c55e"
                    strokeWidth="2"
                  />
                );
              })()}

              {ratings.map((rating, index) => {
                const { x, y } = getCoordinates(index, 1.22);

                let textAnchor: "end" | "middle" | "start" = "middle";

                if (x < cx - 10) {
                  textAnchor = "end";
                }

                if (x > cx + 10) {
                  textAnchor = "start";
                }

                return (
                  <text
                    key={index}
                    x={x}
                    y={y + 4}
                    textAnchor={textAnchor}
                    className="text-[10px] font-black uppercase fill-current text-app-text-muted select-none"
                  >
                    {rating.label}
                  </text>
                );
              })}
            </svg>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 rounded-full text-[10px] font-black text-green-500 uppercase tracking-widest mb-3">
              <Shield className="w-3.5 h-3.5" />
              Arquétipo: {archetype.title}
            </div>

            <h3 className="text-xl font-black text-app-text uppercase tracking-tighter mb-2">
              Características
            </h3>

            <p className="text-app-text-muted text-xs leading-relaxed max-w-sm">
              {archetype.desc}
            </p>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-app-card rounded-[2.5rem] p-8 border border-app-border shadow-lg mt-8"
      >
        <h2 className="text-xl font-black text-app-text uppercase tracking-tighter mb-6 flex items-center">
          <Info className="w-5 h-5 mr-2 text-green-500" />
          Dados de Estatísticas
        </h2>

        <div className="text-sm text-app-text-muted leading-relaxed">
          As estatísticas são carregadas pela rota{" "}
          <span className="font-mono font-black text-app-text">
            /jogadores/{id}/estatisticas
          </span>
          . Elas são atualizadas quando uma partida é encerrada e os times
          rodam.
        </div>
      </motion.div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, delay }: any) => {
  const colors: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-500",
    green: "bg-green-500/10 text-green-500",
    orange: "bg-orange-500/10 text-orange-500",
    purple: "bg-purple-500/10 text-purple-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-app-card p-6 rounded-[2rem] border border-app-border shadow-md hover:shadow-xl transition-all"
    >
      <div
        className={`w-10 h-10 rounded-2xl ${
          colors[color] || colors.blue
        } flex items-center justify-center mb-3`}
      >
        <Icon className="w-5 h-5" />
      </div>

      <div className="text-[10px] font-black text-app-text-muted uppercase tracking-[0.1em] mb-1">
        {label}
      </div>

      <div className="text-2xl font-black text-app-text tracking-tighter">
        {value}
      </div>
    </motion.div>
  );
};

const ResultBar = ({ label, count, total, color }: any) => {
  const safeCount = Number(count || 0);
  const safeTotal = Number(total || 0);

  const percentage = safeTotal > 0 ? (safeCount / safeTotal) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-black text-app-text-muted uppercase tracking-widest">
          {label}
        </span>

        <span className="text-sm font-black text-app-text">
          {safeCount} ({percentage.toFixed(0)}%)
        </span>
      </div>

      <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${color} rounded-full`}
        />
      </div>
    </div>
  );
};

export default PlayerProfile;