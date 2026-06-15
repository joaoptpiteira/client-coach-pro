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
    { code: "POL", name: "Polónia" },
    { code: "MAR", name: "Marrocos" },
    { code: "NZL", name: "Nova Zelândia" },
  ],
  B: [
    { code: "CAN", name: "Canadá" },
    { code: "ECU", name: "Equador" },
    { code: "AUT", name: "Áustria" },
    { code: "UZB", name: "Usbequistão" },
  ],
  C: [
    { code: "USA", name: "Estados Unidos" },
    { code: "URU", name: "Uruguai" },
    { code: "EGY", name: "Egito" },
    { code: "JOR", name: "Jordânia" },
  ],
  D: [
    { code: "ESP", name: "Espanha" },
    { code: "COL", name: "Colômbia" },
    { code: "SEN", name: "Senegal" },
    { code: "QAT", name: "Catar" },
  ],
  E: [
    { code: "ARG", name: "Argentina" },
    { code: "JPN", name: "Japão" },
    { code: "CIV", name: "Costa do Marfim" },
    { code: "CUR", name: "Curaçao" },
  ],
  F: [
    { code: "FRA", name: "França" },
    { code: "CRO", name: "Croácia" },
    { code: "TUN", name: "Tunísia" },
    { code: "HAI", name: "Haiti" },
  ],
  G: [
    { code: "ENG", name: "Inglaterra" },
    { code: "SUI", name: "Suíça" },
    { code: "ALG", name: "Argélia" },
    { code: "PAN", name: "Panamá" },
  ],
  H: [
    { code: "BRA", name: "Brasil" },
    { code: "KOR", name: "Coreia do Sul" },
    { code: "GHA", name: "Gana" },
    { code: "PAR", name: "Paraguai" },
  ],
  I: [
    { code: "POR", name: "Portugal" },
    { code: "AUS", name: "Austrália" },
    { code: "CMR", name: "Camarões" },
    { code: "KSA", name: "Arábia Saudita" },
  ],
  J: [
    { code: "GER", name: "Alemanha" },
    { code: "NOR", name: "Noruega" },
    { code: "NGA", name: "Nigéria" },
    { code: "CRC", name: "Costa Rica" },
  ],
  K: [
    { code: "NED", name: "Países Baixos" },
    { code: "SCO", name: "Escócia" },
    { code: "RSA", name: "África do Sul" },
    { code: "IRN", name: "Irão" },
  ],
  L: [
    { code: "BEL", name: "Bélgica" },
    { code: "DEN", name: "Dinamarca" },
    { code: "CPV", name: "Cabo Verde" },
    { code: "JAM", name: "Jamaica" },
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
      // 1) Escudo
      out.push({
        number: n++,
        section: sectionName,
        team: teamName,
        label: `${t.code} — Escudo`,
        is_special: true,
      });
      // 2) Foto de equipa
      out.push({
        number: n++,
        section: sectionName,
        team: teamName,
        label: `${t.code} — Foto de equipa`,
        is_special: false,
      });
      // 3–20) 18 jogadores
      for (let p = 1; p <= 18; p++) {
        out.push({
          number: n++,
          section: sectionName,
          team: teamName,
          label: `${t.code} ${p}`,
          is_special: false,
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
