import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/components/pt/BottomNav";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/pt")({
  head: () => ({ meta: [{ title: "PT Manager" }] }),
  component: PtLayout,
});

function PtLayout() {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen pb-20">
      <header className="max-w-2xl mx-auto px-5 pt-6 pb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-primary/80 font-semibold">
            PT Manager
          </p>
          <h1 className="font-display text-2xl leading-none mt-0.5">Personal Training</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sair">
          <LogOut className="w-4 h-4" />
        </Button>
      </header>
      <div className="max-w-2xl mx-auto">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
