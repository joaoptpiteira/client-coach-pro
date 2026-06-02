import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ClientCard } from "@/components/pt/ClientCard";
import { ClientFormDialog } from "@/components/pt/ClientFormDialog";
import { listClients, type PtClient, type ClientStatus } from "@/lib/pt-clients";

export const Route = createFileRoute("/_authenticated/pt/clients")({
  head: () => ({ meta: [{ title: "Clientes · PT" }] }),
  component: ClientsPage,
});

function ClientsPage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<ClientStatus>("ativo");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PtClient | null>(null);

  const { data: clients = [], isLoading, refetch } = useQuery({
    queryKey: ["pt_clients"],
    queryFn: listClients,
  });

  const buckets = useMemo(() => {
    const out = { ativo: [] as PtClient[], antigo: [] as PtClient[], prospect: [] as PtClient[] };
    for (const c of clients) out[c.status].push(c);
    return out;
  }, [clients]);

  const list = buckets[tab].filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      (c.telefone ?? "").includes(search),
  );

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (c: PtClient) => { setEditing(c); setDialogOpen(true); };

  return (
    <main className="px-5 pt-2 pb-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 bg-surface border-border"
          />
        </div>
        <Button size="icon" className="h-11 w-11 shrink-0 rounded-xl" onClick={openNew} aria-label="Novo">
          {tab === "prospect" ? <UserPlus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ClientStatus)}>
        <TabsList className="w-full bg-muted/60 rounded-xl h-11 p-1">
          <TabsTrigger value="ativo" className="flex-1 rounded-lg text-xs">
            Ativos ({buckets.ativo.length})
          </TabsTrigger>
          <TabsTrigger value="antigo" className="flex-1 rounded-lg text-xs">
            Antigos ({buckets.antigo.length})
          </TabsTrigger>
          <TabsTrigger value="prospect" className="flex-1 rounded-lg text-xs">
            Prospects ({buckets.prospect.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-2.5">
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {search
                ? "Sem resultados."
                : tab === "ativo"
                  ? "Sem clientes ativos. Toca + para criar."
                  : tab === "antigo"
                    ? "Sem clientes antigos."
                    : "Sem prospects. Toca + para adicionar."}
            </p>
          </div>
        ) : (
          list.map((c) => <ClientCard key={c.id} client={c} onClick={() => openEdit(c)} />)
        )}
      </div>

      <ClientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={editing}
        defaultStatus={tab}
        onSaved={() => refetch()}
      />
    </main>
  );
}
