import React, { useState, useEffect } from "react";
import api from "../services/api";
import { toast } from "react-hot-toast";
import { Users, Plus, Pencil, Trash2, Loader2, MapPin } from "lucide-react";
import { getLocalData, saveLocalData, updateLocalData, deleteLocalData } from "../lib/localData";

interface Team {
  id: string;
  name: string;
  city: string;
}

const Teams = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({ name: "", city: "" });

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await api.get("/times");
      const data = Array.isArray(response.data) ? response.data : [];
      
      const locals = getLocalData("times");
      const combined = [...data, ...locals.filter((l: any) => !data.some((d: any) => d.id === l.id))];
      setTeams(combined);
    } catch (error) {
      console.warn("Server times fetch failed, using local storage");
      setTeams(getLocalData("times"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingTeam) {
        updateLocalData("times", editingTeam.id, formData);
        api.put(`/times/${editingTeam.id}`, formData).catch(e => console.warn("Sync failed", e));
        toast.success("Time atualizado!");
      } else {
        saveLocalData("times", formData);
        api.post("/times", formData).catch(e => console.warn("Sync failed", e));
        toast.success("Time criado!");
      }
      setShowModal(false);
      setFormData({ name: "", city: "" });
      setEditingTeam(null);
      fetchTeams();
    } catch (error) {
      toast.error("Erro ao salvar time.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este time?")) return;
    try {
      deleteLocalData("times", id);
      api.delete(`/times/${id}`).catch(e => console.warn("Sync failed", e));
      toast.success("Time excluído!");
      fetchTeams();
    } catch (error) {
      toast.error("Erro ao excluir time.");
    }
  };

  const openModal = (team?: Team) => {
    if (team) {
      setEditingTeam(team);
      setFormData({ name: team.name, city: team.city });
    } else {
      setEditingTeam(null);
      setFormData({ name: "", city: "" });
    }
    setShowModal(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-app-text flex items-center">
          <Users className="mr-2 h-6 w-6 text-blue-500" />
          Gestão de Times
        </h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="mr-2 h-5 w-5" />
          Novo Time
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 bg-app-card rounded-xl border border-dashed border-app-border">
          <Users className="mx-auto h-12 w-12 text-app-text-muted opacity-20 mb-4" />
          <p className="text-app-text-muted italic">Nenhum time cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div key={team.id} className="bg-app-card p-6 rounded-xl border border-app-border hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shadow-sm group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-app-text group-hover:text-blue-500 transition-colors">{team.name}</h3>
                  <p className="text-sm text-app-text-muted flex items-center mt-1">
                    <MapPin className="h-4 w-4 mr-1 opacity-50" />
                    {team.city}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => openModal(team)} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button onClick={() => handleDelete(team.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-app-card rounded-2xl p-6 max-w-md w-full border border-app-border shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-app-text">{editingTeam ? "Editar Time" : "Novo Time"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-app-text-muted mb-1">Nome do Time</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-app-border bg-app-bg rounded-lg focus:ring-blue-500 focus:border-blue-500 text-app-text placeholder-app-text-muted/30"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Real Madrid"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-app-text-muted mb-1">Cidade</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-app-border bg-app-bg rounded-lg focus:ring-blue-500 focus:border-blue-500 text-app-text placeholder-app-text-muted/30"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Ex: São Paulo"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-app-text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center transition-colors shadow-lg shadow-blue-900/20"
                >
                  {isSubmitting && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teams;
