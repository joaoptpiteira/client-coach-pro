// Catálogo base para o álbum World Cup 2026 (Panini-style).
// Estrutura aproximada (editável depois pelo utilizador):
//   - Torneio (1-30): logo, troféu, mascotes, estádios, cidades
//   - 48 equipas em 12 grupos (A-L), 20 cromos cada (escudo, foto equipa, 18 jogadores)
//   - Lendas (991-1020)
// Total: 1020 cromos.

export type CatalogEntry = {
  number: number;
  section: string;
  team: string | null;
  label: string;
  is_special: boolean;
};

const HOST_CITIES = [
  "Atlanta", "Boston", "Dallas", "Guadalajara", "Cidade do México",
  "Miami", "Monterrey", "Filadélfia", "São Francisco", "Seattle",
  "Toronto", "Vancouver", "Houston", "Kansas City", "Los Angeles",
  "Nova Iorque/Nova Jérsia",
];

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export function buildDefaultCatalog(): CatalogEntry[] {
  const out: CatalogEntry[] = [];
  let n = 1;

  // ---- Torneio (1-30) ----
  const intro: { label: string; special?: boolean }[] = [
    { label: "Logo Oficial", special: true },
    { label: "Taça FIFA", special: true },
    { label: "Mascote — Maple (Canadá)", special: true },
    { label: "Mascote — Zayu (México)", special: true },
    { label: "Mascote — Clutch (EUA)", special: true },
    { label: "Bola Oficial", special: true },
    { label: "Pôster World Cup 26 (1/2)", special: true },
    { label: "Pôster World Cup 26 (2/2)", special: true },
  ];
  for (const i of intro) {
    out.push({ number: n++, section: "Torneio", team: null, label: i.label, is_special: !!i.special });
  }
  // Sedes / estádios
  for (const city of HOST_CITIES) {
    out.push({ number: n++, section: "Torneio", team: null, label: `Cidade-sede — ${city}`, is_special: false });
  }
  // preencher até 30 com "Momentos / Identidade"
  while (n <= 30) {
    out.push({ number: n, section: "Torneio", team: null, label: `Identidade Visual #${n - 24}`, is_special: false });
    n++;
  }

  // ---- 48 Equipas (12 grupos × 4) ----
  for (const g of GROUPS) {
    for (let t = 1; t <= 4; t++) {
      const teamLabel = `Equipa ${g}${t}`;
      // 1 escudo + 1 foto equipa + 18 jogadores = 20 cromos
      out.push({ number: n++, section: `Grupo ${g}`, team: teamLabel, label: `${teamLabel} — Escudo`, is_special: true });
      out.push({ number: n++, section: `Grupo ${g}`, team: teamLabel, label: `${teamLabel} — Foto de equipa`, is_special: false });
      for (let p = 1; p <= 18; p++) {
        out.push({
          number: n++,
          section: `Grupo ${g}`,
          team: teamLabel,
          label: `${teamLabel} — Jogador ${p}`,
          is_special: false,
        });
      }
    }
  }

  // ---- Lendas (30) ----
  for (let i = 1; i <= 30; i++) {
    out.push({
      number: n++,
      section: "Lendas",
      team: null,
      label: `Lenda #${i}`,
      is_special: true,
    });
  }

  return out;
}

export const SECTIONS_ORDER = [
  "Torneio",
  ...GROUPS.map((g) => `Grupo ${g}`),
  "Lendas",
];
