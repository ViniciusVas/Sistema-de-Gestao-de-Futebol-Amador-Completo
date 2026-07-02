import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { toast } from "react-hot-toast";
import { Trophy, Plus, Loader2, Calendar, Settings } from "lucide-react";
import { getLocalData, saveLocalData } from "../lib/localData";

interface Championship {
  id: string;
  nome: string;
  formato: string;
  data_inicio: string;
  status: string;
}

const Championships = () => {
  const navigate = useNavigate();
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({ 
    nome: "", 
    formato: "pontos_corridos",
    isHomeAndAway: false,
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchChampionships();
  }, []);

  const fetchChampionships = async () => {
    try {
      const response = await api.get("/championships");
      setChampionships(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching championships", error);
      setChampionships([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/championships", {
        titulo: formData.nome,
        format: formData.formato,
        isHomeAndAway: formData.isHomeAndAway,
        startDate: formData.data_inicio,
        endDate: formData.data_fim
      });
      
      toast.success("Campeonato criado!");
      setShowModal(false);
      setFormData({ 
        nome: "", 
        formato: "pontos_corridos",
        isHomeAndAway: false,
        data_inicio: new Date().toISOString().split('T')[0],
        data_fim: new Date().toISOString().split('T')[0]
      });
      fetchChampionships();
    } catch (error) {
      toast.error("Erro ao criar campeonato.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-app-text flex items-center uppercase tracking-tight">
            <Trophy className="mr-2 h-6 w-6 text-yellow-500" />
            Campeonatos
          </h1>
          <p className="text-app-text-muted font-medium">Organize torneios e ligas para seus jogadores.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition shadow-lg shadow-blue-900/20 font-bold text-sm"
        >
          <Plus className="mr-2 h-5 w-5" />
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
          <p className="text-app-text-muted font-medium italic">Nenhum campeonato cadastrado ainda.</p>
          <button 
            onClick={() => setShowModal(true)}
            className="mt-4 text-blue-400 font-black hover:text-blue-300 transition uppercase tracking-widest text-xs"
          >
            Começar primeiro campeonato
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {championships.map((champ) => (
            <div 
              key={champ.id} 
              onClick={() => navigate(`/championships/${champ.id}`)}
              className="bg-app-card p-6 rounded-2xl border border-app-border hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer group shadow-sm"
            >
              <div className="flex items-center mb-4">
                <div className="bg-yellow-500/10 p-4 rounded-2xl mr-4 group-hover:scale-110 transition shadow-inner">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-app-text truncate uppercase tracking-tight">{champ.nome}</h3>
                  <div className="flex items-center mt-1">
                     <span className={`w-2 h-2 rounded-full mr-2 shadow-sm ${champ.status === 'ativo' ? 'bg-green-500 shadow-green-500/50' : 'bg-zinc-300 dark:bg-zinc-700'}`}></span>
                     <span className="text-[10px] text-app-text-muted uppercase font-black tracking-widest">{champ.status}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-app-border text-[10px] font-black uppercase tracking-widest">
                 <div className="text-app-text-muted">
                    <div className="flex items-center mb-1 text-app-text-muted">
                       <Calendar className="w-3 h-3 mr-1" /> Início
                    </div>
                    <div className="text-app-text font-bold">{champ.data_inicio ? new Date(champ.data_inicio).toLocaleDateString() : 'A definir'}</div>
                 </div>
                 <div className="text-app-text-muted">
                    <div className="flex items-center mb-1 text-app-text-muted">
                       <Settings className="w-3 h-3 mr-1" /> Formato
                    </div>
                    <div className="text-app-text font-bold">{champ.formato?.replace('_', ' ') || 'Simples'}</div>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-app-card rounded-3xl p-8 max-w-md w-full border border-app-border shadow-2xl">
            <h2 className="text-2xl font-black mb-6 text-app-text uppercase tracking-tighter">Criar Campeonato</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1 pl-1">Nome do Campeonato</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: COPA ELITE 2024"
                  className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-app-text placeholder-app-text-muted/50 font-bold"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              
               <div>
                <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1 pl-1">Formato</label>
                <select 
                  className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-app-text font-bold appearance-none cursor-pointer"
                  value={formData.formato}
                  onChange={(e) => setFormData({ ...formData, formato: e.target.value })}
                >
                   <option value="pontos_corridos">Pontos Corridos</option>
                   <option value="grupos_mata">Grupos + Mata-Mata</option>
                </select>
              </div>

              <div className="flex items-center gap-2 px-1">
                <input
                  type="checkbox"
                  id="isHomeAndAway"
                  className="w-4 h-4 rounded border-app-border"
                  checked={formData.isHomeAndAway}
                  onChange={(e) => setFormData({ ...formData, isHomeAndAway: e.target.checked })}
                />
                <label htmlFor="isHomeAndAway" className="text-[10px] font-black text-app-text-muted uppercase tracking-widest cursor-pointer">Jogos de Ida e Volta</label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1 pl-1">Data Início</label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-app-text font-bold"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-app-text-muted uppercase tracking-widest mb-1 pl-1">Data Fim</label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-app-text font-bold"
                    value={formData.data_fim}
                    onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 text-app-text-muted font-black uppercase tracking-widest text-[10px] hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 font-black uppercase tracking-widest text-[10px] flex items-center justify-center transition shadow-lg shadow-blue-900/20"
                >
                  {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Criar Agora"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Championships;
