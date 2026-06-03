import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, LayoutGrid, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/imobiliario")({
  head: () => ({ meta: [{ title: "Imobiliário" }] }),
  component: ImoLayout,
});

function ImoLayout() {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="max-w-2xl mx-auto px-5 pt-8 pb-4 flex items-end justify-between gap-3">
        <div className="flex items-end gap-3 min-w-0">
          <Link
            to="/"
            aria-label="Voltar ao hub"
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-surface shrink-0 mb-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.32em] text-primary font-medium">
              JP HUB · Imobiliário
            </p>
            <h1 className="font-display text-3xl leading-none mt-1.5 font-semibold tracking-tight truncate">
              Casa <span className="text-primary italic font-light">hunt</span>
            </h1>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={signOut}
          aria-label="Sair"
          className="rounded-full hover:bg-surface shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </header>
      <div className="max-w-2xl mx-auto">
        <Outlet />
      </div>
      <nav className="fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-2xl mx-auto px-4 pb-3 pt-2">
          <ul className="grid grid-cols-2 bg-surface/90 backdrop-blur-xl border border-border rounded-2xl shadow-2xl shadow-black/40 p-1">
            <li>
              <Link
                to="/imobiliario"
                activeOptions={{ exact: true }}
                activeProps={{ className: "text-primary-foreground bg-primary" }}
                inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
                className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-[10px] uppercase tracking-[0.12em] font-medium transition-all"
              >
                <LayoutGrid className="w-[18px] h-[18px]" strokeWidth={1.8} />
                <span>Anúncios</span>
              </Link>
            </li>
            <li>
              <Link
                to="/imobiliario/config"
                activeProps={{ className: "text-primary-foreground bg-primary" }}
                inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
                className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-[10px] uppercase tracking-[0.12em] font-medium transition-all"
              >
                <Settings className="w-[18px] h-[18px]" strokeWidth={1.8} />
                <span>Configurar</span>
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  );
}
