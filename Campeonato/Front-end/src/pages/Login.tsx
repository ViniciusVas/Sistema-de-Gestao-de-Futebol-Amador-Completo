import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { LogIn, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import api from "../services/api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginLocal } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Tentar login via Django JWT
      try {
        const response = await api.post("/login/", { email, password });
        const { access, refresh } = response.data;
        localStorage.setItem("organizer_refresh", refresh);

        // Buscar dados do perfil com o token obtido
        const profileResponse = await api.get("/perfil/", {
          headers: { Authorization: `Bearer ${access}` },
        });
        const profile = profileResponse.data;
        const user = {
          id: profile.email,
          name: `${profile.first_name}${profile.last_name ? " " + profile.last_name : ""}`.trim(),
          email: profile.email,
        };
        login(user, access);
        toast.success("Login realizado com sucesso!");
        navigate("/");
        return;
      } catch (e: any) {
        // 401 = credenciais erradas — não há fallback útil, mostrar erro imediatamente
        if (e?.response?.status === 401 || e?.response?.status === 400) {
          toast.error("Credenciais inválidas ou usuário não encontrado.");
          return;
        }
        // Outros erros (rede, servidor fora do ar) → tentar localStorage
        console.warn("Servidor indisponível, tentando armazenamento local", e);
      }

      // Fallback para login local apenas quando o servidor não responde
      const success = await loginLocal(email, password);
      if (success) {
        toast.success("Login realizado com sucesso (Local)!");
        navigate("/");
      } else {
        toast.error("Servidor indisponível e nenhuma sessão local encontrada.");
      }
    } catch (error: any) {
      toast.error("Erro ao fazer login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{ 
        backgroundImage: `url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2000&auto=format&fit=crop')` 
      }}
    >
      {/* Dark overlay for better contrast */}
      <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-[4px]"></div>

      <div className="max-w-md w-full space-y-8 bg-zinc-900/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-zinc-700 relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/20">
            <LogIn className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">FutGestão</h1>
          <p className="mt-2 text-zinc-400 font-medium font-serif italic">Acesse sua conta de organizador</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-zinc-700 bg-zinc-950/50 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-white placeholder-zinc-600"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full pl-10 pr-10 py-2 border border-zinc-700 bg-zinc-950/50 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-white placeholder-zinc-600"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link to="/register" className="font-medium text-blue-400 hover:text-blue-300">
                Criar nova conta
              </Link>
            </div>
            <div className="text-sm">
              <Link to="/forgot-password" replace className="font-medium text-blue-400 hover:text-blue-300">
                Esqueceu a senha?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all shadow-lg shadow-blue-900/40"
          >
            {isLoading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              <>
                <LogIn className="h-5 w-5 mr-2" />
                Entrar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
