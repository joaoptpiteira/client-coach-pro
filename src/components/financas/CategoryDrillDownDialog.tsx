import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { fmtEUR } from "@/lib/fin-shared";
import type { FinTransaction } from "@/lib/fin-transactions";
import type { FinFixed } from "@/lib/fin-fixed";
import { valorMensalEfetivo } from "@/lib/fin-fixed";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categoryName: string;
  categoryColor: string;
  total: number;
  transactions: FinTransaction[];
  fixas: FinFixed[];
}

export function CategoryDrillDownDialog({
  open, onOpenChange, categoryName, categoryColor, total, transactions, fixas,
}: Props) {
  const txOrdenadas = [...transactions].sort((a, b) => (a.data < b.data ? 1 : -1));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: categoryColor }} />
            {categoryName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total no mês</p>
            <p className="font-display text-2xl text-destructive mt-1 privacy-blur">{fmtEUR(total)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {transactions.length} transação{transactions.length === 1 ? "" : "ões"}
              {fixas.length > 0 && ` · ${fixas.length} fixa${fixas.length === 1 ? "" : "s"}`}
            </p>
          </div>

          {fixas.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pl-1">Fixas</p>
              {fixas.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{f.nome}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {f.tipo_recorrencia === "anual_provisao" ? "Provisão anual" : "Mensal"}
                      {f.dia_pagamento ? ` · dia ${f.dia_pagamento}` : ""}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-primary shrink-0 privacy-blur">
                    {fmtEUR(valorMensalEfetivo(f))}
                  </span>
                </div>
              ))}
            </div>
          )}

          {txOrdenadas.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pl-1">Transações</p>
              {txOrdenadas.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{t.descricao || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(t.data).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}
                      {t.origem === "fixa_gerada" && " · fixa"}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-destructive shrink-0 privacy-blur">
                    {fmtEUR(Number(t.valor))}
                  </span>
                </div>
              ))}
            </div>
          )}

          {fixas.length === 0 && txOrdenadas.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">Sem movimentos.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
