import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { type PtClient, SERVICE_LABEL } from "@/lib/pt-clients";

interface Props {
  client: PtClient;
  onClick: () => void;
}

const fmt = (n: number) => `${n.toFixed(2)}€`;

export function ClientCard({ client: c, onClick }: Props) {
  const restantes = c.treinos_pagos - c.treinos_dados;
  const forecastIcon =
    c.forecast === "continuar" ? <TrendingUp className="w-3 h-3" />
    : c.forecast === "parar" ? <TrendingDown className="w-3 h-3" />
    : <Minus className="w-3 h-3" />;
  const forecastVariant =
    c.forecast === "parar" ? "destructive"
    : c.forecast === "continuar" ? "default"
    : "secondary";

  return (
    <button onClick={onClick} className="text-left w-full">
      <Card className="p-4 bg-surface hover:bg-surface-elevated border-border transition-colors active:scale-[0.99]">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-mono text-sm font-semibold">
            {c.numero}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground truncate">{c.nome}</p>
              {!c.ativo && <Badge variant="outline" className="text-[10px]">Inativo</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <Badge variant="outline" className="text-[10px] font-normal">
                {SERVICE_LABEL[c.service_type]}
              </Badge>
              <Badge variant="outline" className="text-[10px] font-mono font-normal">
                {fmt(Number(c.valor_acordado))}
              </Badge>
              <Badge variant={forecastVariant} className="text-[10px] font-normal gap-1">
                {forecastIcon}
                {c.forecast === "continuar" ? "Continua" : c.forecast === "parar" ? "Vai parar" : "?"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>
                Treinos:{" "}
                <span className={`font-mono font-semibold ${restantes <= 0 ? "text-destructive" : restantes <= 2 ? "text-warning" : "text-foreground"}`}>
                  {restantes}
                </span>{" "}
                / {c.treinos_pagos}
              </span>
              <span className="text-muted-foreground/60">·</span>
              <span className="font-mono">Eu {fmt(Number(c.valor_recebido))}</span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
        </div>
      </Card>
    </button>
  );
}
