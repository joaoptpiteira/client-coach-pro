import { createFileRoute } from "@tanstack/react-router";
import { Dumbbell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pt/trainings")({
  head: () => ({ meta: [{ title: "Treinos · PT" }] }),
  component: TrainingsPage,
});

function TrainingsPage() {
  return (
    <main className="px-5 pt-12 pb-10 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-accent flex items-center justify-center text-primary mb-4">
        <Dumbbell className="w-7 h-7" strokeWidth={1.5} />
      </div>
      <h2 className="font-display text-2xl">Treinos</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
        Vista diária com os clientes que treinam hoje e botão "Treino dado". Disponível na próxima fase.
      </p>
    </main>
  );
}
