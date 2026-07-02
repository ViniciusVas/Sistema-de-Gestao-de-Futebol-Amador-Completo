import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Users,
  Calendar,
  UserCircle,
  LogOut,
  Menu,
  X,
  Radio,
} from "lucide-react";
import { cn } from "../lib/utils";
import ThemeToggle from "./ThemeToggle";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Meus Jogadores", href: "/players", icon: Users },
    { name: "Minhas Peladas", href: "/peladas", icon: Calendar },
    {
      name: "Acompanhar ao Vivo",
      href: "/acompanhamento",
      icon: Radio,
    },
    { name: "Perfil", href: "/profile", icon: UserCircle },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-app-bg flex flex-col md:flex-row text-app-text">
      <aside className="hidden md:flex w-64 flex-col bg-app-sidebar border-r border-app-border">
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-500 font-display tracking-tight">
            FutGestão
          </h1>

          <ThemeToggle />
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                location.pathname === item.href
                  ? "bg-blue-600/10 text-blue-500"
                  : "text-app-text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-app-text"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-app-border">
          <div className="flex items-center mb-4 px-4">
            <div className="h-8 w-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500 font-bold border border-blue-500/20">
              {user?.name.charAt(0).toUpperCase()}
            </div>

            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-app-text truncate">
                {user?.name}
              </p>

              <p className="text-xs text-app-text-muted truncate">
                {user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>

      <header className="md:hidden bg-app-sidebar border-b border-app-border p-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <h1 className="text-xl font-bold text-blue-500 font-display">
          FutGestão
        </h1>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-app-text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-app-sidebar pt-16">
          <nav className="p-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center px-4 py-4 text-lg font-medium rounded-lg transition-colors",
                  location.pathname === item.href
                    ? "bg-blue-600/10 text-blue-500"
                    : "text-app-text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-app-text"
                )}
              >
                <item.icon className="mr-4 h-6 w-6" />
                {item.name}
              </Link>
            ))}

            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-4 text-lg font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <LogOut className="mr-4 h-6 w-6" />
              Sair
            </button>
          </nav>
        </div>
      )}

      <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
    </div>
  );
};

export default Layout;