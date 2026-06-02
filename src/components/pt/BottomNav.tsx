import { Link } from "@tanstack/react-router";
import { LayoutGrid, Users, CreditCard, Dumbbell } from "lucide-react";

const items = [
  { to: "/pt", label: "Dashboard", icon: LayoutGrid, exact: true },
  { to: "/pt/clients", label: "Clientes", icon: Users, exact: false },
  { to: "/pt/payments", label: "Pagamentos", icon: CreditCard, exact: false },
  { to: "/pt/trainings", label: "Treinos", icon: Dumbbell, exact: false },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)]">
      <ul className="max-w-2xl mx-auto grid grid-cols-4">
        {items.map((it) => (
          <li key={it.to}>
            <Link
              to={it.to}
              activeOptions={{ exact: it.exact }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] uppercase tracking-wide font-medium transition-colors"
            >
              <it.icon className="w-5 h-5" strokeWidth={1.75} />
              <span>{it.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
