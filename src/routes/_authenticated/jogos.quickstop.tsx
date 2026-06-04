import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Minus, Plus, RotateCcw, Trash2, Trophy, UserPlus, Crown, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/jogos/quickstop")({
  head: () => ({ meta: [{ title: "Quick Stop · Scoreboard" }] }),
  component: QuickStopPage,
});

type Player = {
  id: string;
  nome: string;
  cartas: number;
  rondasGanhas: number;
  partidasGanhas: number;
};

type State = {
  players: Player[];
  cartasIniciais: number;
  ronda: number;
  partida: number;
  historico: { partida: number; vencedor: string }[];
};

const STORAGE_KEY = "quickstop_scoreboard_v1";

function loadState(): State {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) } as State;
  } catch {
    return defaultState();
  }
}

function defaultState(): State {
  return {
    players: [],
    cartasIniciais: 5,
    ronda: 1,
    partida: 1,
    historico: [],
  };
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function QuickStopPage() {
  const [state, setState] = useState<State>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [novoNome, setNovoNome] = useState("");

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const vencedorAtual = useMemo(() => {
    const zerados = state.players.filter((p) => p.cartas <= 0);
    if (!zerados.length) return null;
    // primeiro a zero = primeiro da lista com cartas 0 (mantemos ordem em que ficaram a zero via partidasGanhas? simplificamos)
    return zerados[0];
  }, [state.players]);

  const ranking = useMemo(
    () => [...state.players].sort((a, b) => a.cartas - b.cartas || b.rondasGanhas - a.rondasGanhas),
    [state.players],
  );

  function addPlayer() {
    const nome = novoNome.trim();
    if (!nome) return;
    setState((s) => ({
      ...s,
      players: [
        ...s.players,
        {
          id: uid(),
          nome,
          cartas: s.cartasIniciais,
          rondasGanhas: 0,
          partidasGanhas: 0,
        },
      ],
    }));
    setNovoNome("");
  }

  function removePlayer(id: string) {
    setState((s) => ({ ...s, players: s.players.filter((p) => p.id !== id) }));
  }

  function setCartas(id: string, delta: number) {
    setState((s) => ({
      ...s,
      players: s.players.map((p) =>
        p.id === id ? { ...p, cartas: Math.max(0, p.cartas + delta) } : p,
      ),
    }));
  }

  function ganhouRonda(id: string) {
    setState((s) => ({
      ...s,
      players: s.players.map((p) =>
        p.id === id
          ? { ...p, rondasGanhas: p.rondasGanhas + 1, cartas: Math.max(0, p.cartas - 1) }
          : p,
      ),
    }));
  }

  function proximaRonda() {
    setState((s) => ({ ...s, ronda: s.ronda + 1 }));
  }

  function terminarPartida() {
    if (!vencedorAtual) return;
    setState((s) => ({
      ...s,
      partida: s.partida + 1,
      ronda: 1,
      historico: [...s.historico, { partida: s.partida, vencedor: vencedorAtual.nome }],
      players: s.players.map((p) => ({
        ...p,
        cartas: s.cartasIniciais,
        rondasGanhas: 0,
        partidasGanhas: p.id === vencedorAtual.id ? p.partidasGanhas + 1 : p.partidasGanhas,
      })),
    }));
  }

  function resetTudo() {
    if (!confirm("Reiniciar tudo (jogadores e histórico)?")) return;
    setState(defaultState());
  }

  function resetCartas() {
    setState((s) => ({
      ...s,
      ronda: 1,
      players: s.players.map((p) => ({ ...p, cartas: s.cartasIniciais, rondasGanhas: 0 })),
    }));
  }

  function setCartasIniciais(n: number) {
    const v = Math.max(1, Math.min(15, n || 0));
    setState((s) => ({
      ...s,
      cartasIniciais: v,
    }));
  }

  return (
    <main className="px-5 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <Link
          to="/jogos"
          aria-label="Voltar"
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-surface"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-[9px] uppercase tracking-[0.3em] text-primary font-medium">
            Scoreboard
          </p>
          <h2 className="font-display text-2xl font-semibold tracking-tight leading-none mt-1">
            Quick Stop
          </h2>
        </div>
      </div>

      {/* Partida + ronda */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-surface border border-border rounded-xl p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Partida</p>
          <p className="font-display text-xl font-semibold mt-0.5">{state.partida}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ronda</p>
          <p className="font-display text-xl font-semibold mt-0.5">{state.ronda}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cartas iniciais</p>
          <Input
            type="number"
            min={1}
            max={15}
            value={state.cartasIniciais}
            onChange={(e) => setCartasIniciais(parseInt(e.target.value, 10))}
            className="h-7 text-center mt-1 text-base"
          />
        </div>
      </div>

      {/* Vencedor */}
      {vencedorAtual && (
        <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <Crown className="w-6 h-6 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-primary">Vencedor da partida</p>
            <p className="font-display text-lg font-semibold truncate">{vencedorAtual.nome}</p>
          </div>
          <Button size="sm" onClick={terminarPartida}>
            <Trophy className="w-4 h-4" /> Terminar
          </Button>
        </div>
      )}

      {/* Add player */}
      <div className="flex gap-2 mb-3">
        <Input
          placeholder="Nome do jogador"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addPlayer()}
        />
        <Button onClick={addPlayer} disabled={!novoNome.trim()}>
          <UserPlus className="w-4 h-4" />
        </Button>
      </div>

      {/* Players */}
      <div className="space-y-2">
        {ranking.map((p, idx) => {
          const isWinner = p.cartas === 0;
          return (
            <div
              key={p.id}
              className={`border rounded-2xl p-3 transition-colors ${
                isWinner ? "border-primary/50 bg-primary/5" : "border-border bg-surface"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center text-xs font-semibold">
                  {idx + 1}
                </div>
                <p className="font-semibold flex-1 truncate">{p.nome}</p>
                {p.partidasGanhas > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <Trophy className="w-3 h-3" /> {p.partidasGanhas}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removePlayer(p.id)}
                  aria-label="Remover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-background border border-border rounded-xl p-2">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground text-center">
                    Cartas
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCartas(p.id, -1)}
                      disabled={p.cartas <= 0}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <span className="font-display text-xl font-semibold tabular-nums">
                      {p.cartas}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setCartas(p.id, 1)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="bg-background border border-border rounded-xl p-2">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground text-center">
                    Rondas ganhas
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-display text-xl font-semibold tabular-nums ml-1">
                      {p.rondasGanhas}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => ganhouRonda(p.id)}
                      disabled={p.cartas <= 0}
                      className="h-7 px-2"
                    >
                      <Medal className="w-3.5 h-3.5" /> +1
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!state.players.length && (
          <div className="text-center py-10 border border-dashed border-border rounded-2xl">
            <p className="text-sm text-muted-foreground">Adiciona pelo menos 2 jogadores para começar.</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {state.players.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Button variant="outline" onClick={proximaRonda}>
            Próxima ronda
          </Button>
          <Button variant="outline" onClick={resetCartas}>
            <RotateCcw className="w-4 h-4" /> Reset partida
          </Button>
        </div>
      )}

      {/* Histórico */}
      {state.historico.length > 0 && (
        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Histórico
          </p>
          <div className="space-y-1.5">
            {state.historico
              .slice()
              .reverse()
              .map((h) => (
                <div
                  key={h.partida}
                  className="flex items-center justify-between text-sm bg-surface border border-border rounded-lg px-3 py-2"
                >
                  <span className="text-muted-foreground">Partida {h.partida}</span>
                  <span className="font-medium flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-primary" />
                    {h.vencedor}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <button
          onClick={resetTudo}
          className="text-[11px] text-muted-foreground hover:text-destructive underline underline-offset-4"
        >
          Reiniciar tudo
        </button>
      </div>
    </main>
  );
}
