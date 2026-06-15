// Catálogo base do álbum Panini FIFA World Cup 26™.
// Estrutura oficial (980 cromos):
//   FWC 1–9       → 9 cromos especiais de abertura (pôster, troféu, mascotes, bola, sedes)
//   FWC 10–20     → 11 lendas / past winners (1930 → 2022)
//   Grupos A–L    → 48 equipas × 20 cromos (escudo + foto equipa + 18 jogadores)
// Total: 9 + 11 + 960 = 980.
//
// Os códigos das equipas (MEX, CAN, USA, …) seguem o padrão FIFA/Panini.
// Os jogadores ficam como "MEX 1 … MEX 18" — editáveis a partir do álbum
// quando a Panini publicar os planteis definitivos.

export type CatalogEntry = {
  number: number;
  section: string;
  team: string | null;
  label: string;
  is_special: boolean;
};

// ---- Especiais de abertura (FWC) ----
const SPECIALS: { label: string }[] = [
  { label: "FWC Pôster Oficial" },
  { label: "FWC Emblema do Torneio" },
  { label: "FWC Troféu FIFA" },
  { label: "FWC Bola Oficial" },
  { label: "FWC Mascote — Maple (Canadá)" },
  { label: "FWC Mascote — Zayu (México)" },
  { label: "FWC Mascote — Clutch (EUA)" },
  { label: "FWC Slogan / Identidade" },
  { label: "FWC Países Anfitriões — CAN · MEX · USA" },
];

// ---- Past Winners / Lendas ----
const LEGENDS: { label: string }[] = [
  { label: "Past Winners — Uruguai 1930" },
  { label: "Past Winners — Itália 1934/1938" },
  { label: "Past Winners — Alemanha 1954/74/90/2014" },
  { label: "Past Winners — Brasil 1958/62/70/94/2002" },
  { label: "Past Winners — Inglaterra 1966" },
  { label: "Past Winners — Argentina 1978/86/2022" },
  { label: "Past Winners — França 1998/2018" },
  { label: "Past Winners — Espanha 2010" },
  { label: "Past Winners — Itália 2006" },
  { label: "Past Winners — Alemanha 2014" },
  { label: "Past Winners — Argentina 2022" },
];

// ---- Grupos A–L (48 equipas, código + nome PT) ----
// Distribuição por pots/anfitriões; os nomes/equipas podem ser editados no álbum.
type TeamDef = { code: string; name: string };

const GROUPS: Record<string, TeamDef[]> = {
  A: [
    { code: "MEX", name: "México" },
    { code: "RSA", name: "África do Sul" },
    { code: "KOR", name: "Coreia do Sul" },
    { code: "CZE", name: "República Checa" },
  ],
  B: [
    { code: "CAN", name: "Canadá" },
    { code: "BIH", name: "Bósnia e Herzegovina" },
    { code: "QAT", name: "Catar" },
    { code: "SUI", name: "Suíça" },
  ],
  C: [
    { code: "BRA", name: "Brasil" },
    { code: "MAR", name: "Marrocos" },
    { code: "HAI", name: "Haiti" },
    { code: "SCO", name: "Escócia" },
  ],
  D: [
    { code: "USA", name: "Estados Unidos" },
    { code: "PAR", name: "Paraguai" },
    { code: "AUS", name: "Austrália" },
    { code: "TUR", name: "Turquia" },
  ],
  E: [
    { code: "GER", name: "Alemanha" },
    { code: "CUW", name: "Curaçau" },
    { code: "CIV", name: "Costa do Marfim" },
    { code: "ECU", name: "Equador" },
  ],
  F: [
    { code: "NED", name: "Países Baixos" },
    { code: "JPN", name: "Japão" },
    { code: "SWE", name: "Suécia" },
    { code: "TUN", name: "Tunísia" },
  ],
  G: [
    { code: "BEL", name: "Bélgica" },
    { code: "EGY", name: "Egito" },
    { code: "IRN", name: "Irão" },
    { code: "NZL", name: "Nova Zelândia" },
  ],
  H: [
    { code: "ESP", name: "Espanha" },
    { code: "CPV", name: "Cabo Verde" },
    { code: "KSA", name: "Arábia Saudita" },
    { code: "URU", name: "Uruguai" },
  ],
  I: [
    { code: "FRA", name: "França" },
    { code: "SEN", name: "Senegal" },
    { code: "IRQ", name: "Iraque" },
    { code: "NOR", name: "Noruega" },
  ],
  J: [
    { code: "ARG", name: "Argentina" },
    { code: "ALG", name: "Argélia" },
    { code: "AUT", name: "Áustria" },
    { code: "JOR", name: "Jordânia" },
  ],
  K: [
    { code: "POR", name: "Portugal" },
    { code: "COD", name: "RD Congo" },
    { code: "UZB", name: "Usbequistão" },
    { code: "COL", name: "Colômbia" },
  ],
  L: [
    { code: "ENG", name: "Inglaterra" },
    { code: "CRO", name: "Croácia" },
    { code: "GHA", name: "Gana" },
    { code: "PAN", name: "Panamá" },
  ],
};



export const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export function buildDefaultCatalog(): CatalogEntry[] {
  const out: CatalogEntry[] = [];
  let n = 1;

  // FWC 1–9 (especiais de abertura)
  for (const s of SPECIALS) {
    out.push({ number: n++, section: "Especiais", team: null, label: s.label, is_special: true });
  }
  // FWC 10–20 (lendas)
  for (const l of LEGENDS) {
    out.push({ number: n++, section: "Especiais", team: null, label: l.label, is_special: true });
  }

  // Grupos A–L
  for (const g of GROUP_LETTERS) {
    const teams = GROUPS[g];
    for (const t of teams) {
      const sectionName = `Grupo ${g}`;
      const teamName = `${t.code} — ${t.name}`;
      // Ordem oficial por equipa (20 cromos):
      //   1       → Escudo
      //   2–12    → Jogadores 1–11
      //   13      → Foto de equipa
      //   14–20   → Jogadores 12–18
      for (let i = 1; i <= 20; i++) {
        let label: string;
        let is_special = false;
        if (i === 1) {
          label = `${t.code} — Escudo`;
          is_special = true;
        } else if (i === 13) {
          label = `${t.code} — Foto de equipa`;
        } else if (i >= 2 && i <= 12) {
          label = `${t.code} ${i - 1}`;
        } else {
          label = `${t.code} ${i - 2}`;
        }
        out.push({
          number: n++,
          section: sectionName,
          team: teamName,
          label,
          is_special,
        });
      }
    }
  }

  return out;
}

export const SECTIONS_ORDER = [
  "Especiais",
  ...GROUP_LETTERS.map((g) => `Grupo ${g}`),
];
