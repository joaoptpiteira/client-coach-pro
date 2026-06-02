import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, Trash2, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { listClients } from "@/lib/pt-clients";
import {
  listTrainingsByDay, createTraining, deleteTraining,
  isoDay, shiftDay, dayLabel,
} from "@/lib/pt-trainings";

export const Route = createFileRoute("/_authenticated/pt/trainings")({
  head: () => ({ meta: [{ title: "Treinos · PT" }] }),
  component: TrainingsPage,
});

function TrainingsPage() {
  const [day, setDay] = useState(() => isoDay(new Date()));
  const { data: clients = [] } = useQuery({ queryKey: ["pt_clients"], queryFn: listClients });
  const { data: trainings = [], refetch, isLoading } = useQuery({
    queryKey: ["pt_trainings", day],
    queryFn: () => listTrainingsByDay(day),
  });

  const ativos = clients.filter((c) => c.status === "ativo" && c.frequencia_semanal > 0);
  const doneIds = new Set(trainings.map((t) => t.client_id));

  const mark = async (clientId: string) => {
    try {
      await createTraining({ client_id: clientId, data: day, notas: null });
      toast.success("Treino registado");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const unmark = async (id: string) => {
    try {
      await deleteTraining(id);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <main className="px-5 pt-2 pb-6 space-y-4">
      {/* Day navigator */}
      <div className="flex items-center justify-between bg-surface border border-border rounded-xl px-2 py-1.5">
        <Button variant="ghost" size="icon" onClick={() => setDay((d) => shiftDay(d, -1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center">
          <p className="font-display text-base capitalize leading-tight">{dayLabel(day)}</p>
          {day !== isoDay(new Date()) && (
            <button onClick={() => setDay(isoDay(new Date()))}
              className="text-[10px] text-primary uppercase tracking-wider">
              Hoje
            </button>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setDay((d) => shiftDay(d, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <Card className="p-5 bg-gradient-to-br from-accent to-surface border-accent/50">
        <p className="text-[11px] uppercase tracking-widest text-accent-foreground/70 font-semibold">
          Treinos dados
        </p>
        <p className="font-display text-4xl text-primary mt-1">
          {trainings.length}<span className="text-2xl text-muted-foreground">/{ativos.length}</span>
        </p>
      </Card>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Clientes ativos
        </p>
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : ativos.length === 0 ? (
          <Card className="p-8 text-center bg-surface border-border">
            <Dumbbell className="w-8 h-8 text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">Sem clientes ativos.</p>
          </Card>
        ) : (
          ativos.map((c) => {
            const t = trainings.find((t) => t.client_id === c.id);
            const done = !!t;
            return (
              <Card key={c.id}
                className={`p-3.5 flex items-center gap-3 transition-colors ${done ? "bg-accent/40 border-primary/30" : "bg-surface border-border"}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.nome}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {c.frequencia_semanal}× / semana
                  </p>
                </div>
                {done ? (
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-primary"
                    onClick={() => unmark(t!.id)}>
                    <Check className="w-3.5 h-3.5" /> Feito
                    <Trash2 className="w-3 h-3 ml-1 opacity-50" />
                  </Button>
                ) : (
                  <Button size="sm" className="h-8" onClick={() => mark(c.id)}>
                    Treino dado
                  </Button>
                )}
              </Card>
            );
          })
        )}
      </div>
    </main>
  );
}
