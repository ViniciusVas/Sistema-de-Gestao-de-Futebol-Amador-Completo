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
  registerLocal: (user: User, password?: string) => Promise<boolean | void>;
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

  const loginLocal = async (email: string, password?: string) => {
    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const { user, token } = response.data;

      login(user, token);

      return true;
    } catch (error) {
      console.error("Erro no login:", error);
      return false;
    }
  };

  const registerLocal = async (user: User, password?: string) => {
    try {
      await api.post("/auth/register", {
        name: user.name,
        email: user.email,
        password,
      });

      return await loginLocal(user.email, password);
    } catch (error) {
      console.error("Erro no registro:", error);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);

    localStorage.removeItem("organizer_user");
    localStorage.removeItem("organizer_token");
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);

    localStorage.setItem(
      "organizer_user",
      JSON.stringify(updatedUser)
    );
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