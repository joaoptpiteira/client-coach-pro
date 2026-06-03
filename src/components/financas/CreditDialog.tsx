import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { createCredit, updateCredit, type FinCredit } from "@/lib/fin-credits";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  credit: FinCredit | null;
  onSaved: () => void;
}

export function CreditDialog({ open, onOpenChange, credit, onSaved }: Props) {
  const [nome, setNome] = useState("");
  const [credor, setCredor] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [valorEmDivida, setValorEmDivida] = useState("");
  const [prestacao, setPrestacao] = useState("");
  const [taxa, setTaxa] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [dia, setDia] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (credit) {
      setNome(credit.nome);
      setCredor(credit.credor ?? "");
      setValorTotal(String(credit.valor_total));
      setValorEmDivida(String(credit.valor_em_divida));
      setPrestacao(String(credit.prestacao_mensal));
      setTaxa(credit.taxa_juro != null ? String(credit.taxa_juro) : "");
      setDataInicio(credit.data_inicio ?? "");
      setDataFim(credit.data_fim ?? "");
      setDia(credit.dia_pagamento != null ? String(credit.dia_pagamento) : "");
      setAtivo(credit.ativo);
      setNotas(credit.notas ?? "");
    } else {
      setNome(""); setCredor(""); setValorTotal(""); setValorEmDivida("");
      setPrestacao(""); setTaxa(""); setDataInicio(""); setDataFim("");
      setDia(""); setAtivo(true); setNotas("");
    }
  }, [open, credit]);

  const save = async () => {
    if (!nome.trim()) { toast.error("Indica um nome"); return; }
    setSaving(true);
    try {
      const payload = {
        nome: nome.trim(),
        credor: credor.trim() || null,
        valor_total: Number(valorTotal || 0),
        valor_em_divida: Number(valorEmDivida || valorTotal || 0),
        prestacao_mensal: Number(prestacao || 0),
        taxa_juro: taxa ? Number(taxa) : null,
        data_inicio: dataInicio || null,
        data_fim: dataFim || null,
        dia_pagamento: dia ? Number(dia) : null,
        ativo,
        notas: notas.trim() || null,
      };
      if (credit) await updateCredit(credit.id, payload);
      else await createCredit(payload);
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{credit ? "Editar crédito" : "Novo crédito"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Crédito habitação" />
          </div>

          <div className="space-y-1.5">
            <Label>Credor</Label>
            <Input value={credor} onChange={(e) => setCredor(e.target.value)} placeholder="Banco, pessoa…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor total (€)</Label>
              <Input type="number" inputMode="decimal" step="0.01" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Em dívida (€)</Label>
              <Input type="number" inputMode="decimal" step="0.01" value={valorEmDivida} onChange={(e) => setValorEmDivida(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prestação/mês (€)</Label>
              <Input type="number" inputMode="decimal" step="0.01" value={prestacao} onChange={(e) => setPrestacao(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Taxa (%)</Label>
              <Input type="number" inputMode="decimal" step="0.01" value={taxa} onChange={(e) => setTaxa(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fim</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Dia</Label>
              <Input type="number" min={1} max={31} value={dia} onChange={(e) => setDia(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <Label className="m-0">Ativo</Label>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "A guardar…" : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
