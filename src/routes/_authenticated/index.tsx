import { createFileRoute, Link } from "@tanstack/react-router";
import { Dumbbell, ArrowUpRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Hub · Início" }] }),
  component: HomePage,
});

interface Module {
  to: string;
  title: string;
  description: string;
  icon: typeof Dumbbell;
  badge: string;
  accent: string;
}

const MODULES: Module[] = [
  {
    to: "/pt/clients",
    title: "Personal Training",
    description: "Gestão de clientes, pagamentos e previsões.",
    icon: Dumbbell,
    badge: "Ativo",
    accent: "from-primary/30 to-primary/5",
  },
];

function HomePage() {
  const { user, signOut } = useAuth();
  const firstName = (user?.user_metadata?.full_name ?? user?.email ?? "").split(/\s|@/)[0];

  return (
    <main className="min-h-screen px-5 pt-14 pb-10 max-w-2xl mx-auto">
      <header className="flex items-start justify-between mb-12">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary/80">Hub Pessoal</p>
          <h1 className="font-display text-4xl mt-2">
            Olá, <span className="italic">{firstName}.</span>
          </h1>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sair">
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      <section>
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Subsistemas</h2>
        <div className="space-y-3">
          {MODULES.map((m) => (
            <Link
              key={m.to}
              to={m.to}
              className="block group"
            >
              <div className={`relative overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-all hover:border-primary/40 hover:bg-surface-elevated`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${m.accent} opacity-60 pointer-events-none`} />
                <div className="relative flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-background/40 backdrop-blur flex items-center justify-center text-primary">
                    <m.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-2xl">{m.title}</h3>
                      <span className="text-[10px] uppercase tracking-wider text-primary px-1.5 py-0.5 rounded bg-primary/10">
                        {m.badge}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          ))}

          <div className="rounded-2xl border border-dashed border-border/60 p-5 text-center">
            <p className="text-sm text-muted-foreground">
              Mais subsistemas em breve.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
