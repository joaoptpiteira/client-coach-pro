import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, TrendingDown, Gift, Dumbbell } from "lucide-react";
import { type PtClient, SERVICE_LABEL, FREQUENCY_LABEL, fmtEUR } from "@/lib/pt-clients";
import { daysSince } from "@/lib/analytics-shared";

interface Props {
  client: PtClient;
  onClick: () => void;
}

export function ClientCard({ client: c, onClick }: Props) {
  const vaiParar = c.status === "ativo" && c.forecast === "parar";
  const temDesconto = Number(c.desconto_afiliado ?? 0) > 0;
  const ultimo = (c as unknown as { ultimo_treino_em: string | null }).ultimo_treino_em;
  const diasSemTreino = c.status === "ativo" ? daysSince(ultimo) : null;
  const alertSemTreino = diasSemTreino !== null && diasSemTreino >= 14;

  return (
    <button onClick={onClick} className="text-left w-full">
      <Card className={`p-4 bg-surface hover:bg-surface-elevated transition-all active:scale-[0.99] ${vaiParar ? "border-destructive/40" : alertSemTreino ? "border-[var(--color-warning,#c9893a)]/40" : "border-border"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground text-base">{c.nome}</h3>
              {vaiParar && (
                <Badge variant="destructive" className="text-[10px] gap-1 px-1.5 py-0">
                  <TrendingDown className="w-2.5 h-2.5" /> Vai parar
                </Badge>
              )}
              {alertSemTreino && !vaiParar && (
                <Badge className="text-[10px] gap-1 px-1.5 py-0 bg-[var(--color-warning,#c9893a)]/20 text-[var(--color-warning,#c9893a)] border-0">
                  <Dumbbell className="w-2.5 h-2.5" /> {diasSemTreino}d sem treino
                </Badge>
              )}
            </div>
            {c.telefone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" /> {c.telefone}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <Badge variant="outline" className="text-[10px] font-normal">
                {SERVICE_LABEL[c.service_type]}
              </Badge>
              {c.frequencia_semanal > 0 && (
                <Badge variant="outline" className="text-[10px] font-normal">
                  {FREQUENCY_LABEL[c.frequencia_semanal] ?? `${c.frequencia_semanal}x/semana`}
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] font-mono font-normal">
                {fmtEUR(Number(c.valor_acordado))}
              </Badge>
              {temDesconto && (
                <Badge className="text-[10px] font-normal gap-1 bg-accent text-accent-foreground border-0">
                  <Gift className="w-2.5 h-2.5" /> −{fmtEUR(Number(c.desconto_afiliado))}
                </Badge>
              )}
            </div>
          </div>

        </div>
      </Card>
    </button>
  );
}
