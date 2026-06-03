import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, ExternalLink, Eye, MapPin, BedDouble, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  countNovosDesde,
  getConfig,
  listImoveis,
  marcarTodosVistos,
  PORTAIS,
  type Imovel,
} from "@/lib/imoveis";
import { runScrape } from "@/lib/imoveis-scrape.functions";
import { fmtEUR } from "@/lib/fin-shared";

export const Route = createFileRoute("/_authenticated/imobiliario/")({
  component: ImoDashboard,
});

const TIPOS = [
  { id: "apartamento", label: "Apartamento" },
  { id: "moradia", label: "Moradia" },
] as const;

function isNovo(dataIso: string): boolean {
  return Date.now() - new Date(dataIso).getTime() < 24 * 3600 * 1000;
}

function ImoDashboard() {
  const qc = useQueryClient();
  const scrape = useServerFn(runScrape);
  const [filtroPortal, setFiltroPortal] = useState<string>("");
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [scraping, setScraping] = useState(false);

  const cfgQ = useQuery({ queryKey: ["imo", "config"], queryFn: getConfig });
  const listQ = useQuery({
    queryKey: ["imo", "list", filtroPortal, filtroTipo],
    queryFn: () => listImoveis({ portal: filtroPortal || undefined, tipo: filtroTipo || undefined }),
  });
  const novosQ = useQuery({
    queryKey: ["imo", "novos", cfgQ.data?.ultima_visita],
    queryFn: () => countNovosDesde(cfgQ.data?.ultima_visita ?? null),
    enabled: !!cfgQ.data,
  });

  useEffect(() => {
    if (cfgQ.data === null) toast.info("Configura a tua pesquisa primeiro.");
  }, [cfgQ.data]);

  const handleScrape = async () => {
    setScraping(true);
    try {
      const res = await scrape();
      if (!res.ok) toast.error(res.error ?? "Erro");
      else toast.success(`${res.novos} novos · ${res.total} total`);
      if (res.erros && res.erros.length > 0) {
        const msg = res.erros.map((e) => `${e.portal}: ${e.status}`).join(" · ");
        toast.warning(`Portais bloqueados — ${msg}`, { duration: 6000 });
      }
      await qc.invalidateQueries({ queryKey: ["imo"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar");
    } finally {
      setScraping(false);
    }
  };

  const handleMarcarVistos = async () => {
    try {
      await marcarTodosVistos();
      await qc.invalidateQueries({ queryKey: ["imo"] });
      toast.success("Marcados como vistos");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const ultima = cfgQ.data?.ultima_atualizacao;
  const ultimaLabel = useMemo(() => {
    if (!ultima) return "Nunca";
    return new Date(ultima).toLocaleString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [ultima]);

  const lista = listQ.data ?? [];
  const novos = novosQ.data ?? 0;

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Top card */}
      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              Última atualização
            </p>
            <p className="font-display text-lg font-semibold mt-1">{ultimaLabel}</p>
            {novos > 0 && (
              <p className="text-xs text-primary mt-1">
                {novos} {novos === 1 ? "novo" : "novos"} desde a última visita
              </p>
            )}
          </div>
          <Button onClick={handleScrape} disabled={scraping} className="shrink-0">
            <RefreshCw className={`w-4 h-4 ${scraping ? "animate-spin" : ""}`} />
            {scraping ? "A pesquisar..." : "Atualizar agora"}
          </Button>
        </div>
        <div className="flex gap-2 mt-3">
          {novos > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarcarVistos}>
              <Eye className="w-3.5 h-3.5" /> Marcar todos como vistos
            </Button>
          )}
          {cfgQ.data === null && (
            <Button asChild variant="outline" size="sm">
              <Link to="/imobiliario/config">Configurar pesquisa</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filtroPortal}
          onChange={(e) => setFiltroPortal(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Todos os portais</option>
          {PORTAIS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Todos os tipos</option>
          {TIPOS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {listQ.isLoading && <p className="text-sm text-muted-foreground">A carregar...</p>}
        {!listQ.isLoading && lista.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-2xl">
            Sem anúncios. Carrega em "Atualizar agora".
          </div>
        )}
        {lista.map((im) => (
          <Card key={im.id} imovel={im} />
        ))}
      </div>
    </div>
  );
}

function Card({ imovel }: { imovel: Imovel }) {
  const novo = isNovo(imovel.data_encontrado);
  const portalLabel = PORTAIS.find((p) => p.id === imovel.portal)?.label ?? imovel.portal;
  return (
    <a
      href={imovel.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-surface border border-border rounded-2xl p-4 hover:border-primary/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] uppercase tracking-[0.18em] text-primary/80">
              {portalLabel}
            </span>
            {novo && (
              <span className="text-[9px] uppercase tracking-[0.18em] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                Novo
              </span>
            )}
            {!imovel.visto && !novo && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </div>
          <h3 className="font-medium text-sm leading-snug line-clamp-2">{imovel.titulo}</h3>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
            {imovel.localizacao && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {imovel.localizacao}
              </span>
            )}
            {imovel.quartos != null && (
              <span className="flex items-center gap-1">
                <BedDouble className="w-3 h-3" /> {imovel.quartos}
              </span>
            )}
            {imovel.area != null && (
              <span className="flex items-center gap-1">
                <Maximize className="w-3 h-3" /> {imovel.area}m²
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          {imovel.preco != null ? (
            <p className="font-display text-lg font-semibold text-primary">
              {fmtEUR(Number(imovel.preco)).replace(",00", "")}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">s/ preço</p>
          )}
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground ml-auto mt-1" />
        </div>
      </div>
    </a>
  );
}
