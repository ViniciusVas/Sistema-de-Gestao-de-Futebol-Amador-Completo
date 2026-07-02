import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { UserPlus, Mail, Lock, User, Loader2, Eye, EyeOff } from "lucide-react";
import api from "../services/api";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, registerLocal } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);
    
    try {
      // 1. Tentar persistir no servidor primeiro
      try {
        const response = await api.post("/register", { name, email, password });
        const { user, token } = response.data;
        login(user, token);
        toast.success("Conta criada com sucesso!");
        navigate("/");
        return;
      } catch (e: any) {
        console.warn("Server registration failed, falling back to local storage", e);
      }

      // 2. Verificação básica de usuário existente localmente (fallback)
      const existingUsers = JSON.parse(localStorage.getItem("local_users") || "[]");
      if (existingUsers.some((u: any) => u.email === email)) {
        toast.error("Este email já está cadastrado localmente.");
        setIsLoading(false);
        return;
      }

      // 3. Criar objeto de usuário local
      const newUser = { 
        id: "local-" + Date.now(), 
        name, 
        email,
        createdAt: new Date().toISOString()
      };
      
      // 4. Salvar localmente e fazer login local
      registerLocal(newUser, password);
      toast.success("Conta criada localmente (Servidor indisponível)!");
      
      setTimeout(() => {
        navigate("/");
      }, 100);

    } catch (error) {
      console.error("Register error:", error);
      toast.error("Erro interno ao criar conta.");
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
      <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-[4px]"></div>

      <div className="max-w-md w-full space-y-8 bg-zinc-900/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-zinc-700 relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/20">
            <UserPlus className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">FutGestão</h1>
          <p className="mt-2 text-zinc-400 font-medium font-serif italic">Crie sua conta de organizador</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Nome Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-zinc-700 bg-zinc-950/50 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-white placeholder-zinc-600"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
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
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Confirmar Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className="block w-full pl-10 pr-10 py-2 border border-zinc-700 bg-zinc-950/50 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-white placeholder-zinc-600"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="text-sm text-center">
            <Link to="/login" className="font-medium text-blue-400 hover:text-blue-300">
              Já tem uma conta? Faça login
            </Link>
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
                <UserPlus className="h-5 w-5 mr-2" />
                Cadastrar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
