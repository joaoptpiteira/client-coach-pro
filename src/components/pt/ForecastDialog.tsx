import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { TrendingUp } from "lucide-react";
import {
  updateClient, fmtEUR, previsaoCliente, valorAPagar,
  type Forecast, type PtClient,
} from "@/lib/pt-clients";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clients: PtClient[];
  onSaved: () => void;
}

type RowState = { forecast: Forecast; forecast_valor: string; saving: boolean };

const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

export function ForecastDialog({ open, onOpenChange, clients, onSaved }: Props) {
  const [rows, setRows] = useState<Record<string, RowState>>({});

  useEffect(() => {
    if (!open) return;
    const next: Record<string, RowState> = {};
    for (const c of clients) {
      next[c.id] = {
        forecast: c.forecast,
        forecast_valor: c.forecast_valor != null ? String(c.forecast_valor) : "",
        saving: false,
      };
    }
    setRows(next);
  }, [open, clients]);

  const persist = async (c: PtClient, patch: Partial<RowState>) => {
    const current = rows[c.id];
    const merged = { ...current, ...patch };
    setRows((r) => ({ ...r, [c.id]: { ...merged, saving: true } }));
    try {
      await updateClient(c.id, {
        forecast: merged.forecast,
        forecast_valor: num(merged.forecast_valor),
      });
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro a guardar");
    } finally {
      setRows((r) => ({ ...r, [c.id]: { ...merged, saving: false } }));
    }
  };

  const total = clients.reduce((s, c) => {
    const r = rows[c.id];
    if (!r) return s + previsaoCliente(c);
    if (r.forecast === "parar") return s;
    const v = num(r.forecast_valor);
    return s + (v != null ? v : valorAPagar(c));
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> Previsão próximo mês
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-xl bg-accent/50 p-3 flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Total</span>
          <span className="font-display text-2xl text-primary">{fmtEUR(total)}</span>
        </div>

        <div className="space-y-3 py-1">
          {clients.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Sem clientes ativos.</p>
          )}
          {clients.map((c) => {
            const r = rows[c.id] ?? { forecast: c.forecast, forecast_valor: "", saving: false };
            const parar = r.forecast === "parar";
            return (
              <div key={c.id} className={`rounded-xl border p-3 space-y-2 ${parar ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/30"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{c.nome}</span>
                  <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                    {fmtEUR(valorAPagar(c))} líquido
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={r.forecast}
                    onValueChange={(v) => persist(c, { forecast: v as Forecast })}
                  >
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="continuar">Vai continuar</SelectItem>
                      <SelectItem value="parar">Vai parar</SelectItem>
                      <SelectItem value="indefinido">Indefinido</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number" inputMode="decimal" step="0.01"
                    placeholder={`€ ${valorAPagar(c).toFixed(0)}`}
                    value={r.forecast_valor}
                    disabled={parar}
                    onChange={(e) => setRows((s) => ({ ...s, [c.id]: { ...r, forecast_valor: e.target.value } }))}
                    onBlur={() => persist(c, {})}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
