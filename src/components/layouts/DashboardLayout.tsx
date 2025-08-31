import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  Moon,
  Sun,
  LayoutDashboard,
  List,
  PiggyBank,
  Settings,
  Menu,
  ChevronsLeft,
  ChevronsRight,
  FilePlus2,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  // Load preferences
  useEffect(() => {
    const storedDark = localStorage.getItem("darkMode");
    const storedSidebar = localStorage.getItem("sidebarOpen");

    if (storedDark !== null) {
      const parsed = JSON.parse(storedDark);
      setDarkMode(parsed);
      document.documentElement.classList.toggle("dark", parsed);
    } else {
      // default sulla preferenza di sistema
      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDarkMode(prefersDark);
      document.documentElement.classList.toggle("dark", prefersDark);
      localStorage.setItem("darkMode", JSON.stringify(prefersDark));
    }

    if (storedSidebar !== null) {
      setSidebarOpen(JSON.parse(storedSidebar));
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("sidebarOpen", JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div
      className={cn(
        "min-h-screen flex transition-colors duration-300",
        darkMode ? "bg-[#0f172a] text-white" : "bg-white text-gray-900"
      )}
    >
      {/* Sidebar */}
      <aside
        className={cn(
          "transition-all duration-300 z-20 md:relative fixed md:translate-x-0 inset-y-0 left-0",
          sidebarOpen ? "w-64 translate-x-0" : "w-20 md:w-20 -translate-x-full md:translate-x-0",
          darkMode ? "bg-[#0f172a] text-white" : "bg-white text-gray-800",
          "min-h-screen shadow-md flex flex-col p-4"
        )}
      >
        <div className="text-xl font-bold flex items-center gap-2 mb-8">
          <span role="img" aria-label="logo">💸</span>
          {sidebarOpen && <span>Bugetto</span>}
        </div>

        <nav className="flex flex-col gap-2 text-sm">
          {/* Dashboard */}
          <Link
            to="/"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-all",
              isActive("/")
                ? "bg-muted text-foreground font-semibold"
                : "hover:bg-muted hover:text-foreground"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>

          {/* Operazioni (gruppo con sottolink) */}
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground select-none",
              "cursor-default"
            )}
          >
            <List className="w-5 h-5" />
            {sidebarOpen && <span className="font-semibold">Operazioni</span>}
          </div>
          <div className={cn("flex flex-col", sidebarOpen ? "ml-9" : "ml-0")}>
            <Link
              to="/operations/new"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-all",
                isActive("/operations") || isActive("/operations/new")
                  ? "bg-muted text-foreground font-semibold"
                  : "hover:bg-muted hover:text-foreground"
              )}
            >
              <FilePlus2 className="w-5 h-5" />
              {sidebarOpen && <span>Nuova operazione</span>}
            </Link>

            <Link
              to="/operations/manage"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-all",
                isActive("/operations/manage")
                  ? "bg-muted text-foreground font-semibold"
                  : "hover:bg-muted hover:text-foreground"
              )}
            >
              <ListChecks className="w-5 h-5" />
              {sidebarOpen && <span>Gestisci operazioni</span>}
            </Link>
          </div>

          {/* Altri link (lasciati come nell’old per coerenza visiva) */}
          <Link
            to="/cashflow"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-all",
              isActive("/cashflow")
                ? "bg-muted text-foreground font-semibold"
                : "hover:bg-muted hover:text-foreground"
            )}
          >
            <PiggyBank className="w-5 h-5" />
            {sidebarOpen && <span>Cashflow</span>}
          </Link>

          <Link
            to="/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-all",
              isActive("/settings")
                ? "bg-muted text-foreground font-semibold"
                : "hover:bg-muted hover:text-foreground"
            )}
          >
            <Settings className="w-5 h-5" />
            {sidebarOpen && <span>Impostazioni</span>}
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className={cn(
            "w-full p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700",
            darkMode ? "bg-[#0f172a] text-white" : "bg-white text-gray-900"
          )}
        >
          <div className="flex items-center gap-4">
            {/* Mobile toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Desktop toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <ChevronsLeft className="h-5 w-5" /> : <ChevronsRight className="h-5 w-5" />}
            </Button>

            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Overview del portafoglio aggiornato</p>
            </div>
          </div>

          {/* Toggle tema */}
          <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </header>

        {/* Page content */}
        <main
          className={cn(
            "flex-1 p-6 transition-colors duration-300",
            darkMode ? "bg-[#1e293b] text-white" : "bg-gray-50 text-gray-900"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
