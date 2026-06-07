import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ensureConfig, getConfig, PORTAIS, saveConfig } from "@/lib/imoveis";

export const Route = createFileRoute("/_authenticated/imobiliario/config")({
  component: ImoConfig,
});

type Tipo = "apartamento" | "moradia" | "ambos";

function ImoConfig() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const cfgQ = useQuery({ queryKey: ["imo", "config"], queryFn: getConfig });

  const [portais, setPortais] = useState<string[]>(["imovirtual", "idealista", "olx"]);
  const [tipo, setTipo] = useState<Tipo>("ambos");
  const [precoMin, setPrecoMin] = useState("");
  const [precoMax, setPrecoMax] = useState("");
  const [quartosMin, setQuartosMin] = useState("");
  const [zona, setZona] = useState("");
  const [diasRecentes, setDiasRecentes] = useState("7");
  const [esconderVistos, setEsconderVistos] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cfgQ.data) {
      setPortais(cfgQ.data.portais ?? []);
      setTipo(cfgQ.data.tipo);
      setPrecoMin(cfgQ.data.preco_min?.toString() ?? "");
      setPrecoMax(cfgQ.data.preco_max?.toString() ?? "");
      setQuartosMin(cfgQ.data.quartos_min?.toString() ?? "");
      setZona(cfgQ.data.zona ?? "");
      setDiasRecentes(cfgQ.data.dias_recentes?.toString() ?? "7");
      setEsconderVistos(cfgQ.data.esconder_vistos ?? false);
    }
  }, [cfgQ.data]);

  const togglePortal = (id: string) => {
    setPortais((cur) => (cur.includes(id) ? cur.filter((p) => p !== id) : [...cur, id]));
  };

  const handleSave = async () => {
    if (portais.length === 0) {
      toast.error("Seleciona pelo menos um portal");
      return;
    }
    setSaving(true);
    try {
      await ensureConfig();
      await saveConfig({
        portais,
        tipo,
        preco_min: precoMin ? Number(precoMin) : null,
        preco_max: precoMax ? Number(precoMax) : null,
        quartos_min: quartosMin ? Number(quartosMin) : null,
        zona: zona.trim() || null,
        dias_recentes: Math.max(1, Number(diasRecentes) || 7),
        esconder_vistos: esconderVistos,
      });
      await qc.invalidateQueries({ queryKey: ["imo"] });
      toast.success("Configuração guardada");
      nav({ to: "/imobiliario" });
    } catch (e) {
      console.error("[saveConfig] erro", e);
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e
            ? String((e as { message: unknown }).message)
            : JSON.stringify(e);
      toast.error(`Erro ao guardar: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-5 py-4 space-y-5">
      <div>
        <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Portais</p>
        <div className="grid grid-cols-2 gap-2">
          {PORTAIS.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2 bg-surface border border-border rounded-xl px-3 py-2.5 cursor-pointer"
            >
              <Checkbox
                checked={portais.includes(p.id)}
                onCheckedChange={() => togglePortal(p.id)}
              />
              <span className="text-sm">{p.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Tipo</p>
        <div className="grid grid-cols-3 gap-2">
          {(["apartamento", "moradia", "ambos"] as Tipo[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`py-2.5 rounded-xl text-sm capitalize border transition-colors ${
                tipo === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-surface border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Preço mín (€)</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={precoMin}
            onChange={(e) => setPrecoMin(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Preço máx (€)</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={precoMax}
            onChange={(e) => setPrecoMax(e.target.value)}
            placeholder="500000"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Quartos mínimos</Label>
        <Input
          type="number"
          inputMode="numeric"
          value={quartosMin}
          onChange={(e) => setQuartosMin(e.target.value)}
          placeholder="2"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Zona / distrito</Label>
        <Input
          value={zona}
          onChange={(e) => setZona(e.target.value)}
          placeholder="ex: Porto, Braga, Lisboa"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Mostrar últimos (dias)</Label>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={diasRecentes}
            onChange={(e) => setDiasRecentes(e.target.value)}
            placeholder="7"
          />
        </div>
        <label className="flex items-end gap-2 pb-2 cursor-pointer">
          <Checkbox
            checked={esconderVistos}
            onCheckedChange={(v) => setEsconderVistos(v === true)}
          />
          <span className="text-sm">Esconder já vistos</span>
        </label>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="w-4 h-4" />
        {saving ? "A guardar..." : "Guardar"}
      </Button>
    </div>
  );
}
