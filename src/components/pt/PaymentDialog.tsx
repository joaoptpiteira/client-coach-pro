import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  type PtClient, valorRealPT, valorAPagar, fmtEUR,
} from "@/lib/pt-clients";
import { createPayment, mesRef } from "@/lib/pt-payments";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clients: PtClient[];
  defaultMonth: string;
  defaultClientId?: string | null;
  onSaved: () => void;
}

export function PaymentDialog({ open, onOpenChange, clients, defaultMonth, defaultClientId, onSaved }: Props) {
  const [clientId, setClientId] = useState<string>(defaultClientId ?? "");
  const [mes, setMes] = useState(defaultMonth);
  const [data, setData] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [valor, setValor] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setClientId(defaultClientId ?? clients[0]?.id ?? "");
      setMes(defaultMonth);
      setData(new Date().toISOString().slice(0, 10));
      setValor("");
      setNotas("");
    }
  }, [open, defaultClientId, defaultMonth, clients]);

  const client = clients.find((c) => c.id === clientId);
  const realPT = client ? valorRealPT(client) : 0;
  const aPagar = client ? valorAPagar(client) : 0;

  useEffect(() => {
    if (client && !valor) setValor(String(aPagar || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleSave = async () => {
    if (!client) { toast.error("Escolhe um cliente"); return; }
    const valorPago = Number(valor.replace(",", ".")) || 0;
    if (valorPago <= 0) { toast.error("Indica o valor pago"); return; }
    setSaving(true);
    try {
      await createPayment({
        client_id: client.id,
        data,
        mes_referencia: mes || mesRef(new Date()),
        valor_pago: valorPago,
        valor_pt: realPT,
        notas: notas.trim() || null,
      });
      toast.success("Pagamento registado");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Registar pagamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Escolher…" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mês de referência</Label>
              <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
            </div>
          </div>

          {client && (
            <div className="rounded-xl bg-muted/50 p-3 space-y-1 text-xs">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Decomposição
              </p>
              <Row label="Valor acordado" value={fmtEUR(Number(client.valor_acordado))} />
              {Number(client.valor_ginasio_por_treino) > 0 && (
                <Row label="− Ginásio (mensal)"
                  value={`−${fmtEUR(Number(client.valor_ginasio_por_treino))}`} />
              )}

              {Number(client.valor_acompanhamento_online) > 0 && (
                <Row label="− Acompanhamento online" value={`−${fmtEUR(Number(client.valor_acompanhamento_online))}`} />
              )}
              <div className="pt-1.5 mt-1 border-t border-border/60">
                <Row label="Valor real PT" value={fmtEUR(realPT)} />
              </div>
              {Number(client.desconto_afiliado) > 0 && (
                <Row label="− Desconto afiliado" value={`−${fmtEUR(Number(client.desconto_afiliado))}`} />
              )}
              <div className="pt-1.5 mt-1 border-t border-border/60">
                <Row label="A pagar" value={fmtEUR(aPagar)} accent />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Valor pago (€)</Label>
            <Input type="number" inputMode="decimal" step="0.01"
              value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notas</Label>
            <Textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <div className="flex gap-2 w-full">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-[2]">
              {saving ? "A guardar…" : "Registar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${accent ? "text-primary font-semibold" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
