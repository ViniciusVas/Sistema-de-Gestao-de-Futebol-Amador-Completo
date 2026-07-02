/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Players from "./pages/Players";
import Peladas from "./pages/Peladas";
import PeladaDetail from "./pages/PeladaDetail";
import PeladaSorteio from "./pages/PeladaSorteio";
import PeladaLive from "./pages/PeladaLive";
import PeladaAcompanhamento from "./pages/PeladaAcompanhamento";
import PlayerProfile from "./pages/PlayerProfile";
import Profile from "./pages/Profile";
import Teams from "./pages/Teams";
import Championships from "./pages/Championships";
import ChampionshipDetail from "./pages/ChampionshipDetail";

import Layout from "./components/Layout";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <Layout>{children}</Layout>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Página pública de acompanhamento */}
      <Route
        path="/acompanhamento"
        element={<PeladaAcompanhamento />}
      />
      <Route
        path="/acompanhamento/:id"
        element={<PeladaAcompanhamento />}
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/teams"
        element={
          <ProtectedRoute>
            <Teams />
          </ProtectedRoute>
        }
      />

      <Route
        path="/championships"
        element={
          <ProtectedRoute>
            <Championships />
          </ProtectedRoute>
        }
      />

      <Route
        path="/players"
        element={
          <ProtectedRoute>
            <Players />
          </ProtectedRoute>
        }
      />

      <Route
        path="/peladas"
        element={
          <ProtectedRoute>
            <Peladas />
          </ProtectedRoute>
        }
      />

      <Route
        path="/peladas/:id"
        element={
          <ProtectedRoute>
            <PeladaDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/peladas/:id/sorteio"
        element={
          <ProtectedRoute>
            <PeladaSorteio />
          </ProtectedRoute>
        }
      />

      {/* Tela administrativa original */}
      <Route
        path="/peladas/:id/live"
        element={
          <ProtectedRoute>
            <PeladaLive />
          </ProtectedRoute>
        }
      />

      <Route path="/players/:id" element={<PlayerProfile />} />

      <Route
        path="/championships/:id"
        element={
          <ProtectedRoute>
            <ChampionshipDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
          <Toaster position="top-right" />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}