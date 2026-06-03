import { Link } from "@tanstack/react-router";
import { LayoutGrid, ArrowDownUp, Repeat, Tag, HandCoins } from "lucide-react";

const items = [
  { to: "/financas", label: "Geral", icon: LayoutGrid, exact: true },
  { to: "/financas/variaveis", label: "Variáveis", icon: ArrowDownUp, exact: false },
  { to: "/financas/fixas", label: "Fixas", icon: Repeat, exact: false },
  { to: "/financas/dividas", label: "Dív & Créd", icon: HandCoins, exact: false },
  { to: "/financas/categorias", label: "Categorias", icon: Tag, exact: false },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-2xl mx-auto px-4 pb-3 pt-2">
        <ul className="grid grid-cols-5 bg-surface/90 backdrop-blur-xl border border-border rounded-2xl shadow-2xl shadow-black/40 p-1">
          {items.map((it) => (
            <li key={it.to}>
              <Link
                to={it.to}
                activeOptions={{ exact: it.exact }}
                activeProps={{ className: "text-primary-foreground bg-primary" }}
                inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
                className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-[10px] uppercase tracking-[0.12em] font-medium transition-all"
              >
                <it.icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
                <span>{it.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
