import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Calendar, Settings, Users, Loader2, Search } from "lucide-react";
import publicApi from "../services/publicApi";

interface Championship {
  id: string;
  nome: string;
  formato: string;
  tipo: string;
  status: string;
  modalidade: string;
  data_inicio: string | null;
  data_fim: string | null;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  ativo:     { label: 'Ativo',     cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  encerrado: { label: 'Encerrado', cls: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  rascunho:  { label: 'Rascunho',  cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
};

const PublicChampionships = () => {
  const navigate = useNavigate();
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    publicApi.get('/public/campeonatos/')
      .then(r => setChampionships(r.data.map((c: any) => ({ ...c, id: String(c.id) }))))
      .catch(() => setChampionships([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = championships.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-app-bg">
      {/* Header */}
      <div className="border-b border-app-border bg-app-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-blue-500" />
            <span className="font-black text-app-text text-lg uppercase tracking-tight">Campeonatos</span>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="text-xs font-black uppercase tracking-widest text-app-text-muted hover:text-blue-500 transition px-4 py-2 rounded-xl border border-app-border hover:border-blue-500/30"
          >
            Área do Organizador
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-app-text uppercase tracking-tighter">Campeonatos Públicos</h1>
          <p className="text-app-text-muted text-sm">Acompanhe classificações, resultados e artilharia sem precisar de login.</p>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-text-muted" />
          <input
            type="text"
            placeholder="Buscar campeonato…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-app-card border border-app-border rounded-2xl pl-9 pr-4 py-2.5 text-sm text-app-text placeholder:text-app-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-app-border rounded-3xl">
            <Trophy className="mx-auto h-14 w-14 text-app-text-muted opacity-20 mb-3" />
            <p className="text-app-text-muted italic">Nenhum campeonato encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(c => {
              const st = STATUS_LABEL[c.status] ?? STATUS_LABEL.rascunho;
              return (
                <button
                  key={c.id}
                  onClick={() => navigate(`/c/${c.id}`)}
                  className="bg-app-card border border-app-border rounded-3xl p-6 text-left hover:border-blue-500/40 hover:shadow-lg transition-all group space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition">
                      <Trophy className="w-6 h-6 text-blue-500" />
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${st.cls}`}>{st.label}</span>
                  </div>
                  <div>
                    <h3 className="font-black text-app-text uppercase tracking-tight group-hover:text-blue-500 transition line-clamp-2">{c.nome}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[10px] text-app-text-muted flex items-center gap-1">
                        <Settings className="w-3 h-3" />{c.formato?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-app-text-muted flex items-center gap-1">
                        <Users className="w-3 h-3" />{c.tipo}
                      </span>
                      {c.data_inicio && (
                        <span className="text-[10px] text-app-text-muted flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(c.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicChampionships;
