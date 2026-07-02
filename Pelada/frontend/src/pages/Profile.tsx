import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { 
  User, 
  Mail, 
  Lock, 
  Save, 
  Loader2,
  UserCircle,
  Eye,
  EyeOff
} from "lucide-react";
import api from "../services/api";

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const updatedData = { name, email };

    try {
      const response = await api.put("/auth/profile", updatedData);
      updateUser(response.data);
      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      console.warn("Server update failed, saving locally");
      updateUser({ ...user!, ...updatedData });
      toast.success("Perfil atualizado localmente!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);

    try {
      await api.put("/auth/password", { password });
      toast.success("Senha atualizada com sucesso!");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error("Erro ao atualizar senha.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-app-text">Meu Perfil</h1>
        <p className="text-app-text-muted">Gerencie suas informações de organizador.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="bg-app-card p-6 rounded-2xl border border-app-border text-center">
            <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-blue-500/10 text-blue-400 mb-4 shadow-inner">
              <UserCircle className="h-16 w-16" />
            </div>
            <h2 className="text-lg font-bold text-app-text">{user?.name}</h2>
            <p className="text-sm text-app-text-muted">{user?.email}</p>
            <div className="mt-6 pt-6 border-t border-app-border">
              <p className="text-xs text-app-text-muted uppercase font-bold tracking-widest">Organizador desde</p>
              <p className="text-sm font-medium text-app-text-muted mt-1 uppercase tracking-tighter">Abril 2024</p>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-8">
          {/* Personal Info */}
          <div className="bg-app-card p-6 rounded-2xl border border-app-border">
            <h3 className="text-lg font-bold text-app-text mb-6 flex items-center">
              <User className="mr-2 h-5 w-5 text-blue-500" />
              Informações Pessoais
            </h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-app-text-muted mb-1">Nome</label>
                  <input
                    type="text"
                    required
                    className="block w-full px-3 py-2 border border-app-border bg-app-bg rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-app-text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-text-muted mb-1">Email</label>
                  <input
                    type="email"
                    required
                    className="block w-full px-3 py-2 border border-app-border bg-app-bg rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-app-text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center px-6 py-2 border border-transparent rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>

          {/* Password Update */}
          <div className="bg-app-card p-6 rounded-2xl border border-app-border">
            <h3 className="text-lg font-bold text-app-text mb-6 flex items-center">
              <Lock className="mr-2 h-5 w-5 text-blue-500" />
              Alterar Senha
            </h3>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-app-text-muted mb-1">Nova Senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="block w-full px-3 py-2 pr-10 border border-app-border bg-app-bg rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-app-text placeholder-app-text-muted/30"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-app-text-muted hover:text-app-text transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-text-muted mb-1">Confirmar Nova Senha</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      className="block w-full px-3 py-2 pr-10 border border-app-border bg-app-bg rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-app-text placeholder-app-text-muted/30"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-app-text-muted hover:text-app-text transition-colors"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isLoading || !password}
                  className="inline-flex items-center px-6 py-2 border border-transparent rounded-lg text-sm font-bold text-white bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-600 transition-all shadow-sm disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                  Atualizar Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
