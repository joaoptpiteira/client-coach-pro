import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  createClient, updateClient, type Forecast, type PtClient, type ServiceType,
} from "@/lib/pt-clients";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: PtClient | null;
  onSaved: () => void;
}

interface FormState {
  nome: string;
  service_type: ServiceType;
  valor_acordado: string;
  valor_recebido: string;
  valor_attivo: string;
  valor_ginasio: string;
  treinos_pagos: string;
  treinos_dados: string;
  forecast: Forecast;
  forecast_valor: string;
  forecast_notas: string;
  notas: string;
  ativo: boolean;
}

const empty: FormState = {
  nome: "",
  service_type: "mensalidade",
  valor_acordado: "",
  valor_recebido: "",
  valor_attivo: "",
  valor_ginasio: "",
  treinos_pagos: "",
  treinos_dados: "",
  forecast: "indefinido",
  forecast_valor: "",
  forecast_notas: "",
  notas: "",
  ativo: true,
};

const num = (s: string) => (s.trim() === "" ? 0 : Number(s));

export function ClientFormDialog({ open, onOpenChange, client, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setForm({
        nome: client.nome,
        service_type: client.service_type,
        valor_acordado: String(client.valor_acordado ?? ""),
        valor_recebido: String(client.valor_recebido ?? ""),
        valor_attivo: String(client.valor_attivo ?? ""),
        valor_ginasio: String(client.valor_ginasio ?? ""),
        treinos_pagos: String(client.treinos_pagos ?? ""),
        treinos_dados: String(client.treinos_dados ?? ""),
        forecast: client.forecast,
        forecast_valor: client.forecast_valor != null ? String(client.forecast_valor) : "",
        forecast_notas: client.forecast_notas ?? "",
        notas: client.notas ?? "",
        ativo: client.ativo,
      });
    } else {
      setForm(empty);
    }
  }, [client, open]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const treinosRestantes = num(form.treinos_pagos) - num(form.treinos_dados);

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error("Indica o nome do cliente.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        service_type: form.service_type,
        valor_acordado: num(form.valor_acordado),
        valor_recebido: num(form.valor_recebido),
        valor_attivo: num(form.valor_attivo),
        valor_ginasio: num(form.valor_ginasio),
        treinos_pagos: Math.trunc(num(form.treinos_pagos)),
        treinos_dados: Math.trunc(num(form.treinos_dados)),
        forecast: form.forecast,
        forecast_valor: form.forecast_valor.trim() === "" ? null : num(form.forecast_valor),
        forecast_notas: form.forecast_notas.trim() || null,
        notas: form.notas.trim() || null,
        ativo: form.ativo,
      };
      if (client) {
        await updateClient(client.id, payload);
        toast.success("Cliente atualizado");
      } else {
        await createClient(payload);
        toast.success("Cliente criado");
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro a guardar";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {client ? `Editar #${client.numero} · ${client.nome}` : "Novo cliente"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={form.nome} onChange={(e) => set("nome", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de serviço</Label>
            <Select value={form.service_type} onValueChange={(v) => set("service_type", v as ServiceType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mensalidade">Mensalidade</SelectItem>
                <SelectItem value="pack">Pack</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="va">Valor acordado (€)</Label>
            <Input id="va" type="number" inputMode="decimal" step="0.01"
              value={form.valor_acordado} onChange={(e) => set("valor_acordado", e.target.value)} />
          </div>

          <div className="rounded-lg bg-muted/40 p-3 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Divisão do valor</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label htmlFor="vr" className="text-xs">Eu</Label>
                <Input id="vr" type="number" inputMode="decimal" step="0.01"
                  value={form.valor_recebido} onChange={(e) => set("valor_recebido", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="vat" className="text-xs">+Attivo</Label>
                <Input id="vat" type="number" inputMode="decimal" step="0.01"
                  value={form.valor_attivo} onChange={(e) => set("valor_attivo", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="vg" className="text-xs">Ginásio</Label>
                <Input id="vg" type="number" inputMode="decimal" step="0.01"
                  value={form.valor_ginasio} onChange={(e) => set("valor_ginasio", e.target.value)} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Soma: <span className="font-mono">{(num(form.valor_recebido) + num(form.valor_attivo) + num(form.valor_ginasio)).toFixed(2)}€</span>
              {" "}/ acordado <span className="font-mono">{num(form.valor_acordado).toFixed(2)}€</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tp">Treinos pagos</Label>
              <Input id="tp" type="number" inputMode="numeric" min="0"
                value={form.treinos_pagos} onChange={(e) => set("treinos_pagos", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="td">Treinos dados</Label>
              <Input id="td" type="number" inputMode="numeric" min="0"
                value={form.treinos_dados} onChange={(e) => set("treinos_dados", e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Restantes: <span className={`font-mono font-semibold ${treinosRestantes < 0 ? "text-destructive" : "text-primary"}`}>{treinosRestantes}</span>
          </p>

          <div className="rounded-lg bg-muted/40 p-3 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Previsão próximo mês</p>
            <Select value={form.forecast} onValueChange={(v) => set("forecast", v as Forecast)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="indefinido">Indefinido</SelectItem>
                <SelectItem value="continuar">Continua</SelectItem>
                <SelectItem value="parar">Vai parar</SelectItem>
              </SelectContent>
            </Select>
            <div className="space-y-1.5">
              <Label htmlFor="fv" className="text-xs">Valor previsto (€)</Label>
              <Input id="fv" type="number" inputMode="decimal" step="0.01"
                value={form.forecast_valor} onChange={(e) => set("forecast_valor", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fn" className="text-xs">Notas da previsão</Label>
              <Textarea id="fn" rows={2}
                value={form.forecast_notas} onChange={(e) => set("forecast_notas", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notas">Notas gerais</Label>
            <Textarea id="notas" rows={3}
              value={form.notas} onChange={(e) => set("notas", e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "A guardar…" : client ? "Guardar" : "Criar cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
