import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

interface User {
  id: string;
  name: string;
  email: string;
  date_joined?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  registerLocal: (user: User, password?: string) => void;
  loginLocal: (email: string, password?: string) => Promise<boolean>;
  isAuthenticated: boolean;
  isLoading: boolean;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("organizer_user");
    const storedToken = localStorage.getItem("organizer_token");

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
    setIsLoading(false);
  }, []);

  const login = (user: User, token: string) => {
    setUser(user);
    setToken(token);
    localStorage.setItem("organizer_user", JSON.stringify(user));
    localStorage.setItem("organizer_token", token);
  };

  const registerLocal = (user: User, password?: string) => {
    const existingUsers = JSON.parse(localStorage.getItem("local_users") || "[]");
    localStorage.setItem("local_users", JSON.stringify([...existingUsers, { ...user, password }]));
    login(user, "local-token-" + Date.now());
  };

  const loginLocal = async (email: string, password?: string) => {
    const existingUsers = JSON.parse(localStorage.getItem("local_users") || "[]");
    const user = existingUsers.find((u: any) => u.email === email && (!password || u.password === password));
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      login(userWithoutPassword, "local-token-" + Date.now());
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("organizer_user");
    localStorage.removeItem("organizer_token");
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("organizer_user", JSON.stringify(updatedUser));
    
    // Sincronizar também na lista de usuários locais se existir
    const existingUsers = JSON.parse(localStorage.getItem("local_users") || "[]");
    const updatedUsers = existingUsers.map((u: any) => u.email === updatedUser.email ? { ...u, ...updatedUser } : u);
    localStorage.setItem("local_users", JSON.stringify(updatedUsers));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        registerLocal,
        loginLocal,
        isAuthenticated: !!token,
        isLoading,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
