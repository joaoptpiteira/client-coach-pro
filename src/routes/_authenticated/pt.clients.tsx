import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

import { ClientCard } from "@/components/pt/ClientCard";
import { ClientFormDialog } from "@/components/pt/ClientFormDialog";
import { deleteClient, listClients, type PtClient } from "@/lib/pt-clients";

export const Route = createFileRoute("/_authenticated/pt/clients")({
  head: () => ({ meta: [{ title: "PT · Clientes" }] }),
  component: ClientsPage,
});

type TabValue = "ativos" | "antigos";

function ClientsPage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabValue>("ativos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PtClient | null>(null);

  const { data: clients = [], isLoading, refetch } = useQuery({
    queryKey: ["pt_clients"],
    queryFn: listClients,
  });

  const { ativos, antigos } = useMemo(() => {
    const a: PtClient[] = [], i: PtClient[] = [];
    for (const c of clients) (c.ativo ? a : i).push(c);
    return { ativos: a, antigos: i };
  }, [clients]);

  const list = (tab === "ativos" ? ativos : antigos).filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase()) || String(c.numero).includes(search),
  );

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (c: PtClient) => { setEditing(c); setDialogOpen(true); };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm(`Eliminar #${editing.numero} · ${editing.nome}?`)) return;
    try {
      await deleteClient(editing.id);
      toast.success("Cliente eliminado");
      setDialogOpen(false);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro a eliminar");
    }
  };

  return (
    <main className="min-h-screen pb-24 max-w-2xl mx-auto">
      <header className="px-5 pt-8 pb-4">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Hub
          </Link>
          <span className="text-[10px] uppercase tracking-widest text-primary/80">Personal Training</span>
        </div>
        <h1 className="font-display text-4xl">Clientes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {ativos.length} ativo{ativos.length === 1 ? "" : "s"} · {antigos.length} antigo{antigos.length === 1 ? "" : "s"}
        </p>
      </header>

      <div className="sticky top-0 z-10 bg-background/85 backdrop-blur border-b border-border px-5 py-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Pesquisar nome ou nº…" value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 bg-surface" />
          </div>
          <Button size="icon" className="h-10 w-10 shrink-0" onClick={openNew} aria-label="Novo cliente">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
          <TabsList className="w-full bg-surface">
            <TabsTrigger value="ativos" className="flex-1">Ativos ({ativos.length})</TabsTrigger>
            <TabsTrigger value="antigos" className="flex-1">Antigos ({antigos.length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={tab} className="px-5 mt-4">
        <TabsContent value={tab} className="space-y-2.5 m-0">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">
                {search ? "Sem resultados." : tab === "ativos" ? "Sem clientes. Toca + para criar." : "Sem clientes antigos."}
              </p>
            </div>
          ) : (
            list.map((c) => <ClientCard key={c.id} client={c} onClick={() => openEdit(c)} />)
          )}
        </TabsContent>
      </Tabs>

      <ClientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={editing}
        onSaved={() => refetch()}
      />

      {editing && dialogOpen && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
          <Button variant="destructive" size="sm" onClick={handleDelete} className="shadow-lg">
            <Trash2 className="w-4 h-4" /> Eliminar cliente
          </Button>
        </div>
      )}
    </main>
  );
}
