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
import { Trash2 } from "lucide-react";
import {
  createClient, updateClient, deleteClient,
  valorRealPT, valorAPagar, fmtEUR,
  type ClientStatus, type Forecast, type PtClient, type ServiceType,
} from "@/lib/pt-clients";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: PtClient | null;
  onSaved: () => void;
  defaultStatus?: ClientStatus;
}

interface FormState {
  status: ClientStatus;
  nome: string;
  telefone: string;
  notas: string;
  mes_inicio: string;
  service_type: ServiceType;
  frequencia_semanal: string;
  valor_acordado: string;
  valor_ginasio_por_treino: string;
  valor_acompanhamento_online: string;
  desconto_afiliado: string;
  indicado_por: string;
  forecast: Forecast;
  forecast_valor: string;
  forecast_notas: string;
  treinos_pagos: string;
  treinos_dados: string;
  motivo_saida: string;
}

const empty = (status: ClientStatus = "ativo"): FormState => ({
  status,
  nome: "",
  telefone: "",
  notas: "",
  mes_inicio: "",
  service_type: "mensalidade",
  frequencia_semanal: "2",
  valor_acordado: "",
  valor_ginasio_por_treino: "",
  valor_acompanhamento_online: "",
  desconto_afiliado: "",
  indicado_por: "",
  forecast: "continuar",
  forecast_valor: "",
  forecast_notas: "",
  treinos_pagos: "0",
  treinos_dados: "0",
  motivo_saida: "",
});

const num = (s: string) => (s.trim() === "" ? 0 : Number(s.replace(",", ".")));

export function ClientFormDialog({ open, onOpenChange, client, onSaved, defaultStatus }: Props) {
  const [form, setForm] = useState<FormState>(empty(defaultStatus));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setForm({
        status: client.status,
        nome: client.nome,
        telefone: client.telefone ?? "",
        notas: client.notas ?? "",
        mes_inicio: client.mes_inicio ?? "",
        service_type: client.service_type,
        frequencia_semanal: String(client.frequencia_semanal ?? 2),
        valor_acordado: String(client.valor_acordado ?? ""),
        valor_ginasio_por_treino: String(client.valor_ginasio_por_treino ?? ""),
        valor_acompanhamento_online: String(client.valor_acompanhamento_online ?? ""),
        desconto_afiliado: String(client.desconto_afiliado ?? ""),
        indicado_por: client.indicado_por ?? "",
        forecast: client.forecast,
        forecast_valor: client.forecast_valor != null ? String(client.forecast_valor) : "",
        forecast_notas: client.forecast_notas ?? "",
        treinos_pagos: String(client.treinos_pagos ?? 0),
        treinos_dados: String(client.treinos_dados ?? 0),
        motivo_saida: (client as unknown as { motivo_saida: string | null }).motivo_saida ?? "",
      });
    } else {
      setForm(empty(defaultStatus));
    }
  }, [client, open, defaultStatus]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const isProspect = form.status === "prospect";
  const computed = {
    valor_acordado: num(form.valor_acordado),
    valor_ginasio_por_treino: num(form.valor_ginasio_por_treino),
    valor_acompanhamento_online: num(form.valor_acompanhamento_online),
    frequencia_semanal: num(form.frequencia_semanal),
    desconto_afiliado: num(form.desconto_afiliado),
  };
  const realPT = valorRealPT(computed);
  const aPagar = valorAPagar(computed);

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error("Indica o nome.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        status: form.status,
        nome: form.nome.trim(),
        telefone: form.telefone.trim() || null,
        notas: form.notas.trim() || null,
        mes_inicio: form.mes_inicio || null,
        service_type: form.service_type,
        frequencia_semanal: Math.trunc(num(form.frequencia_semanal)),
        valor_acordado: num(form.valor_acordado),
        valor_ginasio_por_treino: num(form.valor_ginasio_por_treino),
        valor_acompanhamento_online: num(form.valor_acompanhamento_online),
        desconto_afiliado: num(form.desconto_afiliado),
        indicado_por: form.indicado_por.trim() || null,
        forecast: form.forecast,
        forecast_valor: form.forecast_valor.trim() === "" ? null : num(form.forecast_valor),
        forecast_notas: form.forecast_notas.trim() || null,
        treinos_pagos: Math.max(0, Math.trunc(num(form.treinos_pagos))),
        treinos_dados: Math.max(0, Math.trunc(num(form.treinos_dados))),
        motivo_saida: form.status === "antigo" ? (form.motivo_saida.trim() || null) : null,
        // legacy fields kept to satisfy NOT NULL defaults
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
      toast.error(e instanceof Error ? e.message : "Erro a guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async () => {
    if (!client) return;
    const motivo = window.prompt("Motivo de saída? (opcional)", "") ?? "";
    setSaving(true);
    try {
      await updateClient(client.id, {
        status: "antigo",
        motivo_saida: motivo.trim() || null,
      });
      toast.success("Cliente suspenso");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally { setSaving(false); }
  };

  const handleReactivate = async () => {
    if (!client) return;
    setSaving(true);
    try {
      await updateClient(client.id, { status: "ativo" });
      toast.success("Cliente reativado");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!client) return;
    if (!confirm(`Eliminar definitivamente ${client.nome}?`)) return;
    setSaving(true);
    try {
      await deleteClient(client.id);
      toast.success("Eliminado");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {client ? `Editar · ${client.nome}` : "Novo cliente"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <Field label="Estado">
            <Select value={form.status} onValueChange={(v) => set("status", v as ClientStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Cliente ativo</SelectItem>
                <SelectItem value="antigo">Antigo</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {form.status === "antigo" && (
            <Field label="Motivo de saída">
              <Textarea rows={2} value={form.motivo_saida}
                onChange={(e) => set("motivo_saida", e.target.value)}
                placeholder="Ex: financeiro, mudança de cidade, sem disponibilidade…" />
            </Field>
          )}

          <Field label="Nome">
            <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} />
          </Field>

          <Field label="Telefone">
            <Input type="tel" inputMode="tel" value={form.telefone} onChange={(e) => set("telefone", e.target.value)} />
          </Field>

          <Field label="Observações">
            <Textarea rows={2} value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder="Observações…" />
          </Field>

          {!isProspect && (
            <>
              <Field label="Mês de início" hint="Não conta como “não pago” em meses anteriores.">
                <Input type="month" value={form.mes_inicio ? form.mes_inicio.slice(0, 7) : ""}
                  onChange={(e) => set("mes_inicio", e.target.value ? `${e.target.value}-01` : "")} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo">
                  <Select value={form.service_type} onValueChange={(v) => set("service_type", v as ServiceType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensalidade">Mensalidade</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {form.service_type === "pack" ? (
                  <Field label="Nº treinos do pack">
                    <Input type="number" inputMode="numeric" min={1} step={1}
                      value={form.treinos_pagos}
                      onChange={(e) => set("treinos_pagos", e.target.value)} />
                  </Field>
                ) : (
                  <Field label="Frequência">
                    <Select value={form.frequencia_semanal} onValueChange={(v) => set("frequencia_semanal", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1x / semana</SelectItem>
                        <SelectItem value="2">2x / semana</SelectItem>
                        <SelectItem value="3">3x / semana</SelectItem>
                        <SelectItem value="4">4x / semana</SelectItem>
                        <SelectItem value="5">5x / semana</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </div>

              <Field label="Valor total acordado (€)">
                <Input type="number" inputMode="decimal" step="0.01"
                  value={form.valor_acordado} onChange={(e) => set("valor_acordado", e.target.value)} />
              </Field>

              <div className="rounded-xl bg-muted/50 p-3 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Decomposição
                </p>
                <Field label="Ginásio mensal (€)">
                  <Input type="number" inputMode="decimal" step="0.01"
                    value={form.valor_ginasio_por_treino} onChange={(e) => set("valor_ginasio_por_treino", e.target.value)} />
                </Field>

                <Field label="Acompanhamento online (€)">
                  <Input type="number" inputMode="decimal" step="0.01"
                    value={form.valor_acompanhamento_online} onChange={(e) => set("valor_acompanhamento_online", e.target.value)} />
                </Field>
                <Field label="Desconto afiliado (€)">
                  <Input type="number" inputMode="decimal" step="0.01"
                    value={form.desconto_afiliado} onChange={(e) => set("desconto_afiliado", e.target.value)} />
                </Field>

                <div className="text-xs space-y-0.5 pt-1 border-t border-border/60">
                  <Row label="Valor real PT" value={fmtEUR(realPT)} />
                  {computed.desconto_afiliado > 0 && (
                    <Row label="A pagar (c/ desconto)" value={fmtEUR(aPagar)} accent />
                  )}
                </div>
              </div>

              <Field label="Indicado por (opcional)">
                <Input value={form.indicado_por} onChange={(e) => set("indicado_por", e.target.value)} />
              </Field>

              <div className="rounded-xl bg-muted/50 p-3 space-y-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Treinos
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Saldo: <span className="font-mono font-semibold text-foreground">
                      {Math.max(0, Math.trunc(num(form.treinos_pagos)) - Math.trunc(num(form.treinos_dados)))}
                    </span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Treinos pagos">
                    <Input type="number" inputMode="numeric" min={0} step={1}
                      value={form.treinos_pagos} onChange={(e) => set("treinos_pagos", e.target.value)} />
                  </Field>
                  <Field label="Treinos dados">
                    <Input type="number" inputMode="numeric" min={0} step={1}
                      value={form.treinos_dados} onChange={(e) => set("treinos_dados", e.target.value)} />
                  </Field>
                </div>
              </div>

              <div className="rounded-xl bg-muted/50 p-3 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Previsão próximo mês
                </p>
                <Select value={form.forecast} onValueChange={(v) => set("forecast", v as Forecast)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="continuar">Vai continuar</SelectItem>
                    <SelectItem value="parar">Vai parar</SelectItem>
                    <SelectItem value="indefinido">Indefinido</SelectItem>
                  </SelectContent>
                </Select>
                <Field label="Valor previsto (€) — opcional">
                  <Input type="number" inputMode="decimal" step="0.01"
                    value={form.forecast_valor} onChange={(e) => set("forecast_valor", e.target.value)} />
                </Field>
                <Field label="Notas">
                  <Textarea rows={2}
                    value={form.forecast_notas} onChange={(e) => set("forecast_notas", e.target.value)} />
                </Field>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex gap-2 w-full">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-[2]">
              {saving ? "A guardar…" : client ? "Guardar" : "Criar"}
            </Button>
          </div>
          {client && (
            <div className="flex gap-2 w-full">
              {client.status === "ativo" ? (
                <Button variant="outline" onClick={handleSuspend} disabled={saving} className="flex-1">
                  Suspender
                </Button>
              ) : client.status === "antigo" ? (
                <Button variant="outline" onClick={handleReactivate} disabled={saving} className="flex-1">
                  Reativar
                </Button>
              ) : null}
              <Button variant="destructive" size="icon" onClick={handleDelete} disabled={saving}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
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
