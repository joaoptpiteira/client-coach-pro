import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { listClients, updateClient } from "@/lib/pt-clients";
import {
  listTrainingsByDay, createTraining, deleteTraining,
  isoDay, shiftDay, dayLabel,
} from "@/lib/pt-trainings";

export const Route = createFileRoute("/_authenticated/pt/trainings")({
  head: () => ({ meta: [{ title: "Treinos · PT" }] }),
  component: TrainingsPage,
});

function TrainingsPage() {
  const qc = useQueryClient();
  const [day, setDay] = useState(() => isoDay(new Date()));
  const [busy, setBusy] = useState<string | null>(null);

  const { data: clients = [], refetch: refetchClients } = useQuery({
    queryKey: ["pt_clients"], queryFn: listClients,
  });
  const { data: trainings = [], refetch } = useQuery({
    queryKey: ["pt_trainings", day],
    queryFn: () => listTrainingsByDay(day),
  });

  const ativos = clients.filter((c) => c.status === "ativo");
  const saldo = (id: string) => {
    const c = clients.find((x) => x.id === id);
    if (!c) return 0;
    return Number(c.treinos_pagos ?? 0) - Number(c.treinos_dados ?? 0);
  };

  const mark = async (clientId: string) => {
    const c = clients.find((x) => x.id === clientId);
    if (!c) return;
    setBusy(clientId);
    try {
      await createTraining({ client_id: clientId, data: day, notas: null });
      await updateClient(clientId, { treinos_dados: Number(c.treinos_dados ?? 0) + 1 });
      toast.success("Treino registado · -1 ao saldo");
      await Promise.all([refetch(), refetchClients()]);
      qc.invalidateQueries({ queryKey: ["pt_clients"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(null);
    }
  };

  const unmark = async (trainingId: string, clientId: string) => {
    const c = clients.find((x) => x.id === clientId);
    setBusy(clientId);
    try {
      await deleteTraining(trainingId);
      if (c) {
        await updateClient(clientId, {
          treinos_dados: Math.max(0, Number(c.treinos_dados ?? 0) - 1),
        });
      }
      await Promise.all([refetch(), refetchClients()]);
      qc.invalidateQueries({ queryKey: ["pt_clients"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="px-5 pt-2 pb-6 space-y-4">
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
          Treinos dados hoje
        </p>
        <p className="font-display text-4xl text-primary mt-1">
          {trainings.length}
        </p>
      </Card>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Marca os treinos dados
        </p>
        {ativos.length === 0 ? (
          <Card className="p-8 text-center bg-surface border-border">
            <Dumbbell className="w-8 h-8 text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">Sem clientes ativos.</p>
          </Card>
        ) : (
          ativos.map((c) => {
            const t = trainings.find((t) => t.client_id === c.id);
            const done = !!t;
            const s = saldo(c.id);
            return (
              <Card key={c.id}
                className={`p-3.5 flex items-center gap-3 transition-colors ${done ? "bg-accent/40 border-primary/30" : "bg-surface border-border"}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.nome}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Saldo: <span className={s > 0 ? "text-primary font-mono" : "text-destructive font-mono"}>{s}</span> treinos
                  </p>
                </div>
                {done ? (
                  <Button variant="outline" size="sm" className="h-8 gap-1.5"
                    disabled={busy === c.id}
                    onClick={() => unmark(t!.id, c.id)}>
                    <Check className="w-3.5 h-3.5 text-primary" /> Anular
                  </Button>
                ) : (
                  <Button size="sm" className="h-8"
                    disabled={busy === c.id}
                    onClick={() => mark(c.id)}>
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
