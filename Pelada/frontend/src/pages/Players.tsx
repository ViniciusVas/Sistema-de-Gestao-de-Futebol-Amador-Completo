import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Edit2,
  Star,
  UserPlus,
  Loader2,
  X,
  UserX,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "../lib/utils";
import api from "../services/api";

interface Player {
  id: number;
  nome: string;
  nivel_estrelas: number;
  ativo: boolean;
  dataCadastro?: string;
  data_cadastro?: string;
  organizadorId?: number;
}

const Players = () => {
  const navigate = useNavigate();

  const [players, setPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [nivel, setNivel] = useState(3.0);
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    setIsFetching(true);

    try {
      const response = await api.get("/jogadores");

      const sorted = [...response.data].sort((a: Player, b: Player) =>
        (a.nome || "").localeCompare(b.nome || "")
      );

      setPlayers(sorted);
    } catch (error) {
      console.error("Erro ao carregar jogadores:", error);
      toast.error("Erro ao carregar jogadores.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();

    const nomeTratado = name.trim();

    if (!nomeTratado) {
      toast.error("Informe o nome do jogador.");
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        nome: nomeTratado,
        nivel_estrelas: nivel,
        ativo,
      };

      if (editingPlayer) {
        await api.put(`/jogadores/${editingPlayer.id}`, payload);
        toast.success("Jogador atualizado!");
      } else {
        await api.post("/jogadores", payload);
        toast.success("Jogador cadastrado!");
      }

      await fetchPlayers();
      closeModal();
    } catch (error) {
      console.error("Erro ao salvar jogador:", error);
      toast.error("Erro ao salvar jogador.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePlayer = async (id: number) => {
    if (!confirm("Deseja realmente desativar este jogador?")) return;

    try {
      await api.delete(`/jogadores/${id}`);

      toast.success("Jogador desativado!");
      await fetchPlayers();
    } catch (error) {
      console.error("Erro ao desativar jogador:", error);
      toast.error("Erro ao desativar jogador.");
    }
  };

  const openModal = (player?: Player) => {
    if (player) {
      setEditingPlayer(player);
      setName(player.nome);
      setNivel(player.nivel_estrelas);
      setAtivo(player.ativo);
    } else {
      setEditingPlayer(null);
      setName("");
      setNivel(3.0);
      setAtivo(true);
    }

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlayer(null);
    setName("");
    setNivel(3.0);
    setAtivo(true);
  };

  const filteredPlayers = players.filter((player) =>
    (player.nome || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-text">Meus Jogadores</h1>
          <p className="text-app-text-muted">
            Gerencie seu banco de talentos para as peladas.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => openModal()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Jogador
          </button>
        </div>
      </div>

      <div className="bg-app-card p-4 rounded-xl shadow-sm border border-app-border">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-app-text-muted" />
          </div>

          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-app-border bg-app-bg rounded-lg focus:ring-green-500 focus:border-green-500 text-sm text-app-text"
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-app-card rounded-xl shadow-sm border border-app-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-app-border">
            <thead className="bg-zinc-100 dark:bg-zinc-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                  Jogador
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                  Nível
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-app-text-muted uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="bg-app-card divide-y divide-app-border">
              {isFetching ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-app-text-muted"
                  >
                    <Loader2 className="animate-spin h-8 w-8 mx-auto text-green-600" />
                  </td>
                </tr>
              ) : filteredPlayers.length > 0 ? (
                filteredPlayers.map((player) => {
                  const dataCadastro =
                    player.dataCadastro || player.data_cadastro;

                  return (
                    <tr
                      key={player.id}
                      className={cn(
                        "hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors",
                        !player.ativo && "opacity-50"
                      )}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 font-bold border border-green-500/20">
                            {player.nome.charAt(0).toUpperCase()}
                          </div>

                          <div className="ml-4">
                            <div
                              onClick={() => navigate(`/players/${player.id}`)}
                              className="text-sm font-medium text-app-text cursor-pointer hover:text-blue-500 transition-colors"
                            >
                              {player.nome}
                            </div>

                            {dataCadastro && (
                              <div className="text-xs text-app-text-muted">
                                Cadastrado em{" "}
                                {new Date(dataCadastro).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-yellow-500">
                          <Star className="h-4 w-4 fill-current mr-1" />
                          <span className="text-sm font-semibold text-app-text">
                            {Number(player.nivel_estrelas).toFixed(1)}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={cn(
                            "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                            player.ativo
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          )}
                        >
                          {player.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openModal(player)}
                          className="text-blue-400 hover:text-blue-300 p-2"
                          title="Editar jogador"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleDeletePlayer(player.id)}
                          className="text-red-400 hover:text-red-300 p-2"
                          title="Desativar jogador"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-zinc-500"
                  >
                    Nenhum jogador encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-app-card rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-app-border">
            <div className="p-6 border-b border-app-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-app-text">
                {editingPlayer ? "Editar Jogador" : "Novo Jogador"}
              </h2>

              <button
                onClick={closeModal}
                className="p-2 text-app-text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlayer} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-app-text-muted mb-1">
                  Nome Completo
                </label>

                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-app-border bg-app-bg rounded-lg focus:ring-green-500 focus:border-green-500 text-app-text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Neymar Jr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-app-text-muted mb-1">
                  Nível Técnico (Estrelas)
                </label>

                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0.5"
                    max="5.0"
                    step="0.5"
                    className="flex-1 accent-green-600"
                    value={nivel ?? 3.0}
                    onChange={(e) =>
                      setNivel(parseFloat(e.target.value) || 0.5)
                    }
                  />

                  <div className="bg-green-500/10 text-green-500 font-bold px-3 py-1 rounded-lg border border-green-500/20">
                    {nivel.toFixed(1)} ★
                  </div>
                </div>
              </div>

              <div className="flex items-center py-2">
                <input
                  type="checkbox"
                  id="ativo"
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-app-border bg-app-bg rounded"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                />

                <label
                  htmlFor="ativo"
                  className="ml-2 block text-sm text-app-text-muted"
                >
                  Jogador Ativo (disponível para sorteio)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-app-border rounded-lg text-sm font-medium text-app-text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin h-4 w-4 mx-auto" />
                  ) : (
                    "Salvar Jogador"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Players;