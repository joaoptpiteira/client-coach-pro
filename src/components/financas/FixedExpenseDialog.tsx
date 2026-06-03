import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { createFixed, updateFixed, type FinFixed } from "@/lib/fin-fixed";
import type { FinCategory } from "@/lib/fin-categories";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: FinCategory[];
  editing?: FinFixed | null;
  onSaved: () => void;
}

export function FixedExpenseDialog({ open, onOpenChange, categories, editing, onSaved }: Props) {
  const [nome, setNome] = useState("");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [anual, setAnual] = useState(false);
  const [valorMensal, setValorMensal] = useState("");
  const [valorAnual, setValorAnual] = useState("");
  const [mesPagamentoAnual, setMesPagamentoAnual] = useState("1");
  const [diaPagamento, setDiaPagamento] = useState("");
  const [mesInicio, setMesInicio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setNome(editing.nome);
      setCategoriaId(editing.categoria_id ?? "");
      setAnual(editing.tipo_recorrencia === "anual_provisao");
      setValorMensal(String(editing.valor_mensal ?? ""));
      setValorAnual(String(editing.valor_anual ?? ""));
      setMesPagamentoAnual(String(editing.mes_pagamento_anual ?? 1));
      setDiaPagamento(editing.dia_pagamento ? String(editing.dia_pagamento) : "");
      setMesInicio(editing.mes_inicio ?? "");
    } else {
      setNome("");
      setCategoriaId("");
      setAnual(false);
      setValorMensal("");
      setValorAnual("");
      setMesPagamentoAnual("1");
      setDiaPagamento("");
      setMesInicio(new Date().toISOString().slice(0, 10));
    }
  }, [open, editing]);

  const cats = categories.filter((c) => c.tipo === "despesa");

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error("Nome obrigatório");
      return;
    }
    const vm = Number(valorMensal.replace(",", ".")) || 0;
    const va = Number(valorAnual.replace(",", ".")) || 0;
    if (anual && va <= 0) { toast.error("Valor anual inválido"); return; }
    if (!anual && vm <= 0) { toast.error("Valor mensal inválido"); return; }

    setSaving(true);
    try {
      const payload = {
        nome: nome.trim(),
        categoria_id: categoriaId || null,
        tipo_recorrencia: anual ? ("anual_provisao" as const) : ("mensal" as const),
        valor_mensal: anual ? 0 : vm,
        valor_anual: anual ? va : null,
        mes_pagamento_anual: anual ? Number(mesPagamentoAnual) : null,
        dia_pagamento: diaPagamento ? Number(diaPagamento) : null,
        mes_inicio: mesInicio || null,
        ativo: true,
      };
      if (editing) await updateFixed(editing.id, payload);
      else await createFixed(payload);
      toast.success("Guardado");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar despesa fixa" : "Nova despesa fixa"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="nome" className="text-xs">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Renda, Netflix…" />
          </div>

          <div>
            <Label className="text-xs mb-2 block">Categoria</Label>
            <div className="flex flex-wrap gap-1.5">
              {cats.map((c) => {
                const sel = categoriaId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoriaId(c.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      sel ? "border-primary text-foreground" : "border-border text-muted-foreground"
                    }`}
                    style={sel ? { background: `${c.cor}25` } : undefined}
                  >
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: c.cor }} />
                    {c.nome}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm font-medium">Pagamento anual</p>
              <p className="text-[10px] text-muted-foreground">Divide o valor por 12 (ex: IUC, seguros)</p>
            </div>
            <Switch checked={anual} onCheckedChange={setAnual} />
          </div>

          {anual ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="va" className="text-xs">Valor anual (€)</Label>
                <Input id="va" type="number" step="0.01" value={valorAnual} onChange={(e) => setValorAnual(e.target.value)} />
                {valorAnual && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    ≈ {(Number(valorAnual.replace(",", ".")) / 12).toFixed(2)} €/mês
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="mpa" className="text-xs">Mês de pagamento</Label>
                <Input id="mpa" type="number" min="1" max="12" value={mesPagamentoAnual} onChange={(e) => setMesPagamentoAnual(e.target.value)} />
              </div>
            </div>
          ) : (
            <div>
              <Label htmlFor="vm" className="text-xs">Valor mensal (€)</Label>
              <Input id="vm" type="number" step="0.01" value={valorMensal} onChange={(e) => setValorMensal(e.target.value)} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="dp" className="text-xs">Dia do mês</Label>
              <Input id="dp" type="number" min="1" max="31" value={diaPagamento} onChange={(e) => setDiaPagamento(e.target.value)} placeholder="Opcional" />
            </div>
            <div>
              <Label htmlFor="mi" className="text-xs">Início</Label>
              <Input id="mi" type="date" value={mesInicio} onChange={(e) => setMesInicio(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "A guardar…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
