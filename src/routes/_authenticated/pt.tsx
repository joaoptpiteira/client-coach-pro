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
    <div className="min-h-screen pb-24 bg-background">
      <header className="max-w-2xl mx-auto px-5 pt-8 pb-4 flex items-end justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-[0.32em] text-primary font-medium">
            PT · Manager
          </p>
          <h1 className="font-display text-3xl leading-none mt-1.5 font-semibold tracking-tight">
            Personal <span className="text-primary italic font-light">Training</span>
          </h1>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sair" className="rounded-full hover:bg-surface">
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
