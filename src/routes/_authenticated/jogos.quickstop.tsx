import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, RotateCcw, Trash2, Crown, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/jogos/quickstop")({
  head: () => ({ meta: [{ title: "Quick Stop · Scoreboard" }] }),
  component: QuickStopPage,
});

type Player = {
  id: string;
  nome: string;
  pontos: number;
  rondasGanhas: number;
};

type RoundHistory = {
  points: Record<string, number>;
  winnerId: string | null;
};

type State = {
  started: boolean;
  players: Player[];
  ronda: number;
  roundPoints: Record<string, string>;
  history: RoundHistory[];
};

const STORAGE_KEY = "quickstop_scoreboard_v3";

function defaultState(): State {
  return {
    started: false,
    players: [],
    ronda: 1,
    roundPoints: {},
    history: [],
  };
}

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

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function QuickStopPage() {
  const [state, setState] = useState<State>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [setupNames, setSetupNames] = useState<string[]>(["", ""]);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  // Lower points = better (fewer cards)
  const ranking = useMemo(
    () =>
      [...state.players].sort(
        (a, b) => a.pontos - b.pontos || b.rondasGanhas - a.rondasGanhas,
      ),
    [state.players],
  );

  function setName(idx: number, v: string) {
    setSetupNames((arr) => arr.map((n, i) => (i === idx ? v : n)));
  }

  function addNameSlot() {
    setSetupNames((arr) => [...arr, ""]);
  }

  function removeNameSlot(idx: number) {
    setSetupNames((arr) => (arr.length <= 2 ? arr : arr.filter((_, i) => i !== idx)));
  }

  function startGame() {
    const names = setupNames.map((n) => n.trim()).filter(Boolean);
    if (names.length < 2) return;
    const players: Player[] = names.map((nome) => ({
      id: uid(),
      nome,
      pontos: 0,
      rondasGanhas: 0,
    }));
    setState({
      started: true,
      players,
      ronda: 1,
      roundPoints: Object.fromEntries(players.map((p) => [p.id, ""])),
      history: [],
    });
  }

  function updateRoundPoints(id: string, v: string) {
    setState((s) => ({ ...s, roundPoints: { ...s.roundPoints, [id]: v } }));
  }

  function nextRound() {
    setState((s) => {
      const points: Record<string, number> = {};
      for (const p of s.players) {
        points[p.id] = parseInt(s.roundPoints[p.id] || "0", 10) || 0;
      }
      // Winner = player with lowest points this round (fewest cards)
      let winnerId: string | null = null;
      let min = Infinity;
      let tie = false;
      for (const p of s.players) {
        const v = points[p.id];
        if (v < min) {
          min = v;
          winnerId = p.id;
          tie = false;
        } else if (v === min) {
          tie = true;
        }
      }
      if (tie) winnerId = null;

      const players = s.players.map((p) => ({
        ...p,
        pontos: p.pontos + points[p.id],
        rondasGanhas: p.rondasGanhas + (winnerId === p.id ? 1 : 0),
      }));
      return {
        ...s,
        players,
        ronda: s.ronda + 1,
        roundPoints: Object.fromEntries(players.map((p) => [p.id, ""])),
        history: [...s.history, { points, winnerId }],
      };
    });
  }

  function undoRound() {
    setState((s) => {
      if (s.history.length === 0) return s;
      const last = s.history[s.history.length - 1];
      const players = s.players.map((p) => ({
        ...p,
        pontos: p.pontos - (last.points[p.id] || 0),
        rondasGanhas: p.rondasGanhas - (last.winnerId === p.id ? 1 : 0),
      }));
      return {
        ...s,
        players,
        ronda: Math.max(1, s.ronda - 1),
        roundPoints: Object.fromEntries(
          players.map((p) => [p.id, String(last.points[p.id] ?? "")]),
        ),
        history: s.history.slice(0, -1),
      };
    });
  }

  function resetGame() {
    if (!confirm("Reiniciar o jogo?")) return;
    setState(defaultState());
    setSetupNames(["", ""]);
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

      {!state.started ? (
        <section className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
              Jogadores
            </p>
            <div className="space-y-2">
              {setupNames.map((n, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`Jogador ${i + 1}`}
                    value={n}
                    onChange={(e) => setName(i, e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeNameSlot(i)}
                    disabled={setupNames.length <= 2}
                    aria-label="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-2" onClick={addNameSlot}>
              <Plus className="w-4 h-4" /> Adicionar jogador
            </Button>
          </div>

          <Button
            className="w-full"
            onClick={startGame}
            disabled={setupNames.filter((n) => n.trim()).length < 2}
          >
            Começar jogo
          </Button>
        </section>
      ) : (
        <section className="space-y-5">
          <div className="flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Ronda atual
              </p>
              <p className="font-display text-2xl font-semibold leading-none mt-1">
                {state.ronda}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={undoRound}
                disabled={state.history.length === 0}
              >
                <Undo2 className="w-4 h-4" /> Anterior
              </Button>
              <Button variant="ghost" size="sm" onClick={resetGame}>
                <RotateCcw className="w-4 h-4" /> Reiniciar
              </Button>
            </div>
          </div>

          <div className="border border-border rounded-xl overflow-hidden bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jogador</TableHead>
                  <TableHead className="text-right">Cartas</TableHead>
                  <TableHead className="text-right">Rondas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((p, idx) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        {idx === 0 && <Crown className="w-3.5 h-3.5 text-primary" />}
                        {p.nome}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {p.pontos}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.rondasGanhas}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
              Cartas na mão · ronda {state.ronda}
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              Vence a ronda quem tiver menos cartas (atribuído automaticamente).
            </p>
            <div className="space-y-2">
              {state.players.map((p) => (
                <div
                  key={p.id}
                  className="border border-border bg-surface rounded-xl p-3 flex items-center gap-2"
                >
                  <p className="flex-1 truncate font-medium">{p.nome}</p>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={state.roundPoints[p.id] ?? ""}
                    onChange={(e) => updateRoundPoints(p.id, e.target.value)}
                    className="w-20 h-9 text-right"
                  />
                </div>
              ))}
            </div>
          </div>

          <Button className="w-full" size="lg" onClick={nextRound}>
            Próxima ronda
          </Button>
        </section>
      )}
    </main>
  );
}
