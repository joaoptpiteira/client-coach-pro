import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Check,
  Minus,
  Plus,
  Search,
  Sparkles,
  RotateCcw,
  Trash2,
  Pencil,
  Copy,
  Download,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  listStickers,
  seedAlbum,
  updateOwned,
  updateStickerMeta,
  bulkRenameTeam,
  resetAlbum,
  wipeAlbum,
  type Sticker,
} from "@/lib/wc26-stickers";
import { SECTIONS_ORDER } from "@/lib/wc26-catalog";
import { exportCatalogCsv, exportCatalogPdf } from "@/lib/album-export";

export const Route = createFileRoute("/_authenticated/jogos/album")({
  head: () => ({ meta: [{ title: "Álbum World Cup 26" }] }),
  component: AlbumPage,
});

type StatusFilter = "all" | "owned" | "missing" | "duplicates";
type StickerView = "overview" | "section" | "team";

function AlbumPage() {
  const { user } = useAuth();
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState("");
  const [section, setSection] = useState<string | null>(null);
  const [team, setTeam] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<Sticker | null>(null);
  const [renamingTeam, setRenamingTeam] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<null | "reset" | "wipe">(null);

  async function refresh() {
    setLoading(true);
    try {
      const data = await listStickers();
      setStickers(data);
    } catch (e) {
      console.error(e);
      toast.error("Falha a carregar álbum");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const stats = useMemo(() => {
    const total = stickers.length;
    const owned = stickers.filter((s) => s.owned >= 1).length;
    const missing = total - owned;
    const duplicates = stickers.reduce((sum, s) => sum + Math.max(0, s.owned - 1), 0);
    const pct = total ? (owned / total) * 100 : 0;
    return { total, owned, missing, duplicates, pct };
  }, [stickers]);

  const sectionStats = useMemo(() => {
    const map = new Map<string, { total: number; owned: number }>();
    for (const s of stickers) {
      const cur = map.get(s.section) ?? { total: 0, owned: 0 };
      cur.total += 1;
      if (s.owned >= 1) cur.owned += 1;
      map.set(s.section, cur);
    }
    return SECTIONS_ORDER
      .filter((sec) => map.has(sec))
      .map((sec) => ({ section: sec, ...map.get(sec)! }));
  }, [stickers]);

  const teamStats = useMemo(() => {
    if (!section) return [];
    const map = new Map<string, { total: number; owned: number }>();
    for (const s of stickers) {
      if (s.section !== section) continue;
      const key = s.team ?? "—";
      const cur = map.get(key) ?? { total: 0, owned: 0 };
      cur.total += 1;
      if (s.owned >= 1) cur.owned += 1;
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([t, v]) => ({ team: t, ...v }))
      .sort((a, b) => a.team.localeCompare(b.team));
  }, [stickers, section]);

  const view: StickerView = team ? "team" : section ? "section" : "overview";

  const searchQ = search.trim().toLowerCase();
  const isSearching = searchQ.length > 0;

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    return stickers.filter((s) => {
      if (
        s.label.toLowerCase().includes(searchQ) ||
        String(s.number).includes(searchQ) ||
        (s.team?.toLowerCase().includes(searchQ) ?? false)
      ) {
        return true;
      }
      return false;
    }).slice(0, 200);
  }, [stickers, searchQ, isSearching]);

  const teamStickers = useMemo(() => {
    if (!team || !section) return [];
    return stickers
      .filter((s) => s.section === section && s.team === team)
      .filter((s) => {
        if (statusFilter === "owned") return s.owned >= 1;
        if (statusFilter === "missing") return s.owned < 1;
        if (statusFilter === "duplicates") return s.owned >= 2;
        return true;
      });
  }, [stickers, section, team, statusFilter]);

  const sectionSpecials = useMemo(() => {
    // For "Especiais" section (no teams): show all stickers directly
    if (!section || section !== "Especiais") return [];
    return stickers
      .filter((s) => s.section === section)
      .filter((s) => {
        if (statusFilter === "owned") return s.owned >= 1;
        if (statusFilter === "missing") return s.owned < 1;
        if (statusFilter === "duplicates") return s.owned >= 2;
        return true;
      });
  }, [stickers, section, statusFilter]);

  const missingNumbers = useMemo(
    () => stickers.filter((s) => s.owned < 1).map((s) => s.number).join(", "),
    [stickers],
  );

  const duplicatesList = useMemo(
    () =>
      stickers
        .filter((s) => s.owned >= 2)
        .map((s) => `${s.number} (×${s.owned - 1})`)
        .join(", "),
    [stickers],
  );

  async function setOwned(s: Sticker, next: number) {
    const prev = stickers;
    setStickers((cur) => cur.map((x) => (x.id === s.id ? { ...x, owned: Math.max(0, next) } : x)));
    try {
      await updateOwned(s.id, next);
    } catch (e) {
      console.error(e);
      setStickers(prev);
      toast.error("Falha a guardar");
    }
  }

  async function handleSeed() {
    if (!user) return;
    setSeeding(true);
    try {
      const n = await seedAlbum(user.id);
      toast.success(`Álbum iniciado com ${n} cromos`);
      await refresh();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Falha a criar álbum");
    } finally {
      setSeeding(false);
    }
  }

  async function handleReset() {
    try {
      await resetAlbum();
      toast.success("Álbum reposto a zero");
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error("Falha");
    } finally {
      setConfirmReset(null);
    }
  }

  async function handleWipe() {
    try {
      await wipeAlbum();
      toast.success("Álbum apagado");
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error("Falha");
    } finally {
      setConfirmReset(null);
    }
  }

  function copyMissing() {
    if (!missingNumbers) { toast.info("Não faltam cromos 🎉"); return; }
    navigator.clipboard.writeText(missingNumbers);
    toast.success("Faltas copiadas");
  }
  function copyDuplicates() {
    if (!duplicatesList) { toast.info("Sem repetidos"); return; }
    navigator.clipboard.writeText(duplicatesList);
    toast.success("Repetidos copiados");
  }

  // ---- Render ----
  if (loading) {
    return <div className="px-5 py-10 text-sm text-muted-foreground">A carregar…</div>;
  }

  if (stickers.length === 0) {
    return (
      <main className="px-5 pb-16">
        <div className="bg-surface border border-border rounded-2xl p-8 text-center mt-6">
          <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Inicia o teu álbum
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            Vamos criar 980 cromos oficiais Panini: 9 especiais, 11 lendas e 48 equipas
            distribuídas pelos Grupos A–L.
          </p>
          <Button onClick={handleSeed} disabled={seeding} className="mt-5">
            {seeding ? "A criar…" : "Criar álbum World Cup 26"}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="px-5 pb-24 space-y-5">
      {/* Pesquisa global persistente */}
      <div className="sticky top-0 z-20 -mx-5 px-5 pt-2 pb-3 bg-background/95 backdrop-blur border-b border-border/40">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Procurar cromo: nº, nome, equipa…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md hover:bg-surface flex items-center justify-center"
              aria-label="Limpar"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        {/* Breadcrumb */}
        {!isSearching && (section || team) && (
          <div className="flex items-center gap-1 mt-2 text-xs">
            <button
              onClick={() => { setSection(null); setTeam(null); setStatusFilter("all"); }}
              className="text-muted-foreground hover:text-foreground"
            >
              Álbum
            </button>
            {section && (
              <>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <button
                  onClick={() => { setTeam(null); setStatusFilter("all"); }}
                  className={team ? "text-muted-foreground hover:text-foreground" : "font-medium"}
                >
                  {section}
                </button>
              </>
            )}
            {team && (
              <>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium truncate">{team}</span>
              </>
            )}
          </div>
        )}
      </div>

      {isSearching ? (
        <>
          <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            {searchResults.length} resultado{searchResults.length === 1 ? "" : "s"}
            {searchResults.length === 200 && " (limite)"}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {searchResults.map((s) => (
              <StickerCard
                key={s.id}
                sticker={s}
                showContext
                onToggle={() => setOwned(s, s.owned >= 1 ? 0 : 1)}
                onInc={() => setOwned(s, s.owned + 1)}
                onDec={() => setOwned(s, s.owned - 1)}
                onEdit={() => setEditing(s)}
              />
            ))}
            {searchResults.length === 0 && (
              <p className="col-span-full text-center text-xs text-muted-foreground py-8">
                Nada encontrado.
              </p>
            )}
          </div>
        </>
      ) : view === "overview" ? (
        <>
          {/* Stats principais */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <div className="flex items-baseline justify-between">
              <p className="text-[9px] uppercase tracking-[0.32em] text-primary/80">Completion</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {stats.owned}/{stats.total}
              </p>
            </div>
            <div className="flex items-end gap-2 mt-2">
              <span className="font-display text-5xl font-semibold tracking-tight tabular-nums">
                {stats.pct.toFixed(1)}
              </span>
              <span className="text-2xl text-muted-foreground mb-1.5">%</span>
            </div>
            <Progress value={stats.pct} className="mt-3 h-2" />
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <Stat label="Tenho" value={stats.owned} accent="text-emerald-500" />
              <Stat label="Faltam" value={stats.missing} accent="text-amber-500" />
              <Stat label="Repetidos" value={stats.duplicates} accent="text-sky-500" />
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" className="flex-1" onClick={copyMissing}>
                <Copy className="w-3.5 h-3.5" /> Copiar faltas
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={copyDuplicates}>
                <Copy className="w-3.5 h-3.5" /> Copiar repetidos
              </Button>
            </div>
          </div>

          {/* Lista de secções (drill-down) */}
          <div className="space-y-2">
            <p className="text-[9px] uppercase tracking-[0.32em] text-muted-foreground px-1">
              Secções
            </p>
            {sectionStats.map((ss) => {
              const pct = ss.total ? (ss.owned / ss.total) * 100 : 0;
              const done = ss.owned === ss.total;
              return (
                <button
                  key={ss.section}
                  onClick={() => { setSection(ss.section); setTeam(null); }}
                  className="w-full bg-surface border border-border rounded-xl p-3 text-left hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{ss.section}</span>
                        {done && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
                          {ss.owned}/{ss.total}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Exportar catálogo */}
          <div className="pt-4 border-t border-border">
            <p className="text-[9px] uppercase tracking-[0.32em] text-muted-foreground px-1 mb-2">
              Exportar
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline" size="sm" className="flex-1"
                onClick={() => { exportCatalogCsv(stickers); toast.success("CSV exportado"); }}
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
              <Button
                variant="outline" size="sm" className="flex-1"
                onClick={() => { exportCatalogPdf(stickers); toast.success("PDF exportado"); }}
              >
                <FileText className="w-3.5 h-3.5" /> PDF
              </Button>
            </div>
          </div>

          {/* Acções perigosas */}
          <div className="pt-6 border-t border-border flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmReset("reset")}>
              <RotateCcw className="w-3.5 h-3.5" /> Repor a zero
            </Button>
            <Button
              variant="outline" size="sm"
              className="flex-1 text-destructive hover:text-destructive"
              onClick={() => setConfirmReset("wipe")}
            >
              <Trash2 className="w-3.5 h-3.5" /> Apagar álbum
            </Button>
          </div>
        </>
      ) : view === "section" && section === "Especiais" ? (
        <>
          <StatusTabs value={statusFilter} onChange={setStatusFilter} />
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {sectionSpecials.map((s) => (
              <StickerCard
                key={s.id}
                sticker={s}
                onToggle={() => setOwned(s, s.owned >= 1 ? 0 : 1)}
                onInc={() => setOwned(s, s.owned + 1)}
                onDec={() => setOwned(s, s.owned - 1)}
                onEdit={() => setEditing(s)}
              />
            ))}
          </div>
        </>
      ) : view === "section" ? (
        <>
          {/* Lista de equipas do grupo */}
          <div className="space-y-2">
            {teamStats.map((ts) => {
              const pct = ts.total ? (ts.owned / ts.total) * 100 : 0;
              const done = ts.owned === ts.total;
              return (
                <button
                  key={ts.team}
                  onClick={() => { setTeam(ts.team); setStatusFilter("all"); }}
                  className="w-full bg-surface border border-border rounded-xl p-3 text-left hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{ts.team}</span>
                        {done && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
                          {ts.owned}/{ts.total}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* Vista de equipa: stats + filtro estado + grelha */}
          {(() => {
            const all = stickers.filter((s) => s.section === section && s.team === team);
            const owned = all.filter((s) => s.owned >= 1).length;
            const pct = all.length ? (owned / all.length) * 100 : 0;
            return (
              <div className="bg-surface border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.32em] text-primary/80">Equipa</p>
                    <p className="font-display text-xl font-semibold tracking-tight mt-0.5">{team}</p>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => team && setRenamingTeam(team)}
                    aria-label="Renomear"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Progress value={pct} className="h-1.5 flex-1" />
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {owned}/{all.length} · {pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })()}

          <StatusTabs value={statusFilter} onChange={setStatusFilter} />

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {teamStickers.map((s) => (
              <StickerCard
                key={s.id}
                sticker={s}
                onToggle={() => setOwned(s, s.owned >= 1 ? 0 : 1)}
                onInc={() => setOwned(s, s.owned + 1)}
                onDec={() => setOwned(s, s.owned - 1)}
                onEdit={() => setEditing(s)}
              />
            ))}
            {teamStickers.length === 0 && (
              <p className="col-span-full text-center text-xs text-muted-foreground py-8">
                Sem cromos para este filtro.
              </p>
            )}
          </div>
        </>
      )}

      {/* Editar cromo */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cromo #{editing?.number}</DialogTitle>
          </DialogHeader>
          {editing && (
            <EditStickerForm sticker={editing} onSaved={async () => { setEditing(null); await refresh(); }} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!renamingTeam} onOpenChange={(o) => !o && setRenamingTeam(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Renomear equipa</DialogTitle>
          </DialogHeader>
          {renamingTeam && (
            <RenameTeamForm
              current={renamingTeam}
              onDone={async (newName) => {
                setRenamingTeam(null);
                if (team === renamingTeam) setTeam(newName);
                await refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmReset} onOpenChange={(o) => !o && setConfirmReset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmReset === "wipe" ? "Apagar álbum?" : "Repor a zero?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmReset === "wipe"
                ? "Vai apagar todos os cromos. Tens de recriar o álbum depois."
                : "Vai marcar todos os cromos como em falta. Os repetidos também são limpos."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReset === "wipe" ? handleWipe : handleReset}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function StatusTabs({
  value, onChange,
}: { value: StatusFilter; onChange: (v: StatusFilter) => void }) {
  const tabs: { v: StatusFilter; label: string }[] = [
    { v: "all", label: "Todos" },
    { v: "missing", label: "Faltam" },
    { v: "owned", label: "Tenho" },
    { v: "duplicates", label: "Repetidos" },
  ];
  return (
    <div className="grid grid-cols-4 gap-1 bg-surface border border-border rounded-xl p-1">
      {tabs.map((t) => (
        <button
          key={t.v}
          onClick={() => onChange(t.v)}
          className={`text-[11px] py-1.5 rounded-lg transition-colors ${
            value === t.v
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}


function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-background border border-border rounded-xl py-2">
      <p className={`text-lg font-display font-semibold tabular-nums ${accent}`}>{value}</p>
      <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    </div>
  );
}

function shortTitle(label: string): string {
  const parts = label.split(" — ");
  if (parts.length === 2) {
    const code = parts[0];
    const rest = parts[1];
    if (rest === "Foto de equipa") return `${code} Foto`;
    return `${code} ${rest}`;
  }
  return label;
}

function StickerCard({
  sticker: s,
  onToggle,
  onInc,
  onDec,
  onEdit,
  showContext = false,
}: {
  sticker: Sticker;
  onToggle: () => void;
  onInc: () => void;
  onDec: () => void;
  onEdit: () => void;
  showContext?: boolean;
}) {
  const owned = s.owned >= 1;
  const dup = s.owned > 1;
  return (
    <div
      className={`relative rounded-xl border p-2 flex flex-col gap-1 transition-colors ${
        owned
          ? "bg-primary/10 border-primary/40"
          : "bg-surface border-border"
      }`}
    >
      <button
        onClick={onToggle}
        className="absolute top-1 right-1 w-5 h-5 rounded-full border border-border bg-background flex items-center justify-center"
        aria-label={owned ? "Marcar como em falta" : "Marcar como tenho"}
      >
        {owned && <Check className="w-3 h-3 text-primary" />}
      </button>

      <div className="flex items-baseline gap-1">
        <span className="font-display text-lg font-semibold tabular-nums leading-none">
          {shortTitle(s.label)}
        </span>
        {s.is_special && (
          <Sparkles className="w-3 h-3 text-amber-500 ml-auto mr-5" />
        )}
      </div>
      <span className="text-[9px] text-muted-foreground tabular-nums">
        #{s.number}
      </span>
      {showContext && (
        <p className="text-[9px] text-muted-foreground truncate">
          {s.team ?? s.section}
        </p>
      )}

      <div className="flex items-center justify-between gap-1 mt-1">
        <button
          onClick={onDec}
          disabled={s.owned <= 0}
          className="w-6 h-6 rounded-md border border-border flex items-center justify-center disabled:opacity-40"
          aria-label="Diminuir"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span
          className={`text-[10px] tabular-nums font-medium ${
            dup ? "text-sky-500" : owned ? "text-emerald-500" : "text-muted-foreground"
          }`}
        >
          {s.owned === 0 ? "falta" : dup ? `×${s.owned}` : "ok"}
        </span>
        <button
          onClick={onInc}
          className="w-6 h-6 rounded-md border border-border flex items-center justify-center"
          aria-label="Aumentar"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function EditStickerForm({
  sticker,
  onSaved,
}: {
  sticker: Sticker;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(sticker.label);
  const [team, setTeam] = useState(sticker.team ?? "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await updateStickerMeta(sticker.id, {
        label: label.trim() || sticker.label,
        team: team.trim() || null,
      });
      toast.success("Cromo actualizado");
      onSaved();
    } catch (e) {
      console.error(e);
      toast.error("Falha");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Nome do cromo</Label>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Equipa</Label>
        <Input value={team} onChange={(e) => setTeam(e.target.value)} className="mt-1" />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Secção: {sticker.section} · #{sticker.number}
      </p>
      <DialogFooter>
        <Button onClick={submit} disabled={saving}>
          {saving ? "A guardar…" : "Guardar"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function RenameTeamForm({
  current,
  onDone,
}: {
  current: string;
  onDone: (newName: string) => void;
}) {
  const [name, setName] = useState(current);
  const [saving, setSaving] = useState(false);
  async function submit() {
    const next = name.trim();
    if (!next || next === current) {
      onDone(current);
      return;
    }
    setSaving(true);
    try {
      await bulkRenameTeam(current, next);
      toast.success(`Renomeada para ${next}`);
      onDone(next);
    } catch (e) {
      console.error(e);
      toast.error("Falha");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Novo nome</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" autoFocus />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Aplica a todos os 20 cromos da equipa.
      </p>
      <DialogFooter>
        <Button onClick={submit} disabled={saving}>
          {saving ? "A guardar…" : "Renomear"}
        </Button>
      </DialogFooter>
    </div>
  );
}
