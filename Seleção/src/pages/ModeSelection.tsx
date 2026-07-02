import { ArrowRight, Trophy, UsersRound } from "lucide-react";

const MODE_URLS = {
  pelada: import.meta.env.VITE_PELADA_URL || "http://localhost:5173",
  campeonato:
    import.meta.env.VITE_CAMPEONATO_URL || "http://localhost:3000",
};

export default function ModeSelection() {
  const redirectTo = (url: string) => {
    window.location.href = url;
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.16),_transparent_35%)]" />

      <section className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur md:p-10">
          <div className="mb-8 text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400">
              <Trophy size={18} />
              Gestão de Futebol
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              Escolher modo
            </h1>

            <p className="mt-3 text-sm text-slate-400 md:text-base">
              Selecione o sistema que deseja acessar.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <button
              type="button"
              onClick={() => redirectTo(MODE_URLS.pelada)}
              className="group rounded-2xl border border-slate-800 bg-slate-950/70 p-6 text-left transition duration-200 hover:-translate-y-1 hover:border-emerald-500/70 hover:bg-emerald-500/10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 transition group-hover:bg-emerald-500 group-hover:text-white">
                <UsersRound size={28} />
              </div>

              <h2 className="text-xl font-semibold text-white">Pelada</h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Acesse o sistema de organização de peladas, jogadores, times,
                partidas e pagamentos.
              </p>

              <span className="mt-6 flex items-center gap-2 text-sm font-semibold text-emerald-400">
                Acessar Pelada
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </span>
            </button>

            <button
              type="button"
              onClick={() => redirectTo(MODE_URLS.campeonato)}
              className="group rounded-2xl border border-slate-800 bg-slate-950/70 p-6 text-left transition duration-200 hover:-translate-y-1 hover:border-blue-500/70 hover:bg-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 transition group-hover:bg-blue-500 group-hover:text-white">
                <Trophy size={28} />
              </div>

              <h2 className="text-xl font-semibold text-white">Campeonato</h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Acesse o sistema de campeonatos, com equipes, tabela,
                classificação e resultados.
              </p>

              <span className="mt-6 flex items-center gap-2 text-sm font-semibold text-blue-400">
                Acessar Campeonato
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </span>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}