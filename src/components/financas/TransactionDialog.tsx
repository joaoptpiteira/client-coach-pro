import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createTransaction } from "@/lib/fin-transactions";
import type { FinCategory } from "@/lib/fin-categories";
import { mesRef } from "@/lib/fin-shared";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultMonth: string;
  categories: FinCategory[];
  onSaved: () => void;
}

export function TransactionDialog({ open, onOpenChange, defaultMonth, categories, onSaved }: Props) {
  const [tipo, setTipo] = useState<"despesa" | "receita">("despesa");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTipo("despesa");
      setValor("");
      const today = new Date().toISOString().slice(0, 10);
      // Se mês selecionado não é o atual, usar dia 15 do mês selecionado
      const [y, m] = defaultMonth.split("-").map(Number);
      const nowYm = mesRef(new Date());
      setData(defaultMonth === nowYm ? today : `${y}-${String(m).padStart(2, "0")}-15`);
      setCategoriaId("");
      setDescricao("");
    }
  }, [open, defaultMonth]);

  const filteredCats = categories.filter((c) => c.tipo === tipo);

  const handleSave = async () => {
    const valorNum = Number(valor.replace(",", "."));
    if (!valorNum || valorNum <= 0) {
      toast.error("Valor inválido");
      return;
    }
    setSaving(true);
    try {
      const dataObj = new Date(data);
      const ym = mesRef(dataObj);
      await createTransaction({
        tipo,
        valor: valorNum,
        data,
        mes_referencia: ym,
        categoria_id: categoriaId || null,
        descricao: descricao || null,
        origem: "manual",
      });
      toast.success("Registado");
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
          <DialogTitle>Nova transação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Toggle tipo */}
          <div className="grid grid-cols-2 gap-2 bg-muted/40 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => { setTipo("despesa"); setCategoriaId(""); }}
              className={`py-2 rounded-lg text-sm font-medium transition-all ${
                tipo === "despesa" ? "bg-destructive text-destructive-foreground" : "text-muted-foreground"
              }`}
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => { setTipo("receita"); setCategoriaId(""); }}
              className={`py-2 rounded-lg text-sm font-medium transition-all ${
                tipo === "receita" ? "bg-[var(--color-success,#5a8a5a)] text-white" : "text-muted-foreground"
              }`}
            >
              Receita
            </button>
          </div>

          <div>
            <Label htmlFor="valor" className="text-xs">Valor (€)</Label>
            <Input
              id="valor"
              type="number"
              inputMode="decimal"
              step="0.01"
              autoFocus
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="text-2xl h-14 font-display"
              placeholder="0,00"
            />
          </div>

          <div>
            <Label className="text-xs mb-2 block">Categoria</Label>
            <div className="flex flex-wrap gap-1.5">
              {filteredCats.map((c) => {
                const sel = categoriaId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoriaId(c.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      sel ? "border-primary text-foreground" : "border-border text-muted-foreground hover:border-foreground/30"
                    }`}
                    style={sel ? { background: `${c.cor}25` } : undefined}
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-1.5"
                      style={{ background: c.cor }}
                    />
                    {c.nome}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="data" className="text-xs">Data</Label>
              <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="desc" className="text-xs">Descrição</Label>
              <Input
                id="desc"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Opcional"
              />
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
