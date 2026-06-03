import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ScrapedListing = {
  titulo: string;
  preco: number | null;
  localizacao: string | null;
  area: number | null;
  quartos: number | null;
  tipo: string | null;
  portal: string;
  url: string;
};

type Config = {
  portais: string[];
  tipo: "apartamento" | "moradia" | "ambos";
  preco_min: number | null;
  preco_max: number | null;
  quartos_min: number | null;
  zona: string | null;
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) {
      console.warn(`[scrape] ${url} -> HTTP ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (e) {
    console.warn(`[scrape] ${url} failed`, e);
    return null;
  }
}

function parseNumber(s: string | undefined | null): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[^\d,.]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function tipoSlugFromConfig(tipo: Config["tipo"], portal: string): string[] {
  // returns portal-specific URL slug segments to fetch
  if (portal === "imovirtual") {
    if (tipo === "apartamento") return ["apartamento"];
    if (tipo === "moradia") return ["moradia"];
    return ["apartamento", "moradia"];
  }
  if (portal === "idealista") {
    if (tipo === "apartamento") return ["apartamentos"];
    if (tipo === "moradia") return ["moradias"];
    return ["apartamentos", "moradias"];
  }
  if (portal === "olx") {
    if (tipo === "apartamento") return ["apartamentos"];
    if (tipo === "moradia") return ["moradias"];
    return ["apartamentos", "moradias"];
  }
  if (portal === "casasapo") {
    if (tipo === "apartamento") return ["apartamento"];
    if (tipo === "moradia") return ["moradia"];
    return ["apartamento", "moradia"];
  }
  return [""];
}

function zonaSlug(zona: string | null): string {
  if (!zona) return "";
  return zona
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// --- IMOVIRTUAL ---
async function scrapeImovirtual(cfg: Config): Promise<ScrapedListing[]> {
  const out: ScrapedListing[] = [];
  const zona = zonaSlug(cfg.zona) || "todo-o-pais";
  for (const tipo of tipoSlugFromConfig(cfg.tipo, "imovirtual")) {
    const params = new URLSearchParams();
    if (cfg.preco_min) params.set("search[filter_float_price:from]", String(cfg.preco_min));
    if (cfg.preco_max) params.set("search[filter_float_price:to]", String(cfg.preco_max));
    if (cfg.quartos_min) params.set("search[filter_enum_rooms_num][0]", String(cfg.quartos_min));
    const url = `https://www.imovirtual.com/comprar/${tipo}/${zona}/?${params.toString()}`;
    const html = await fetchHtml(url);
    if (!html) continue;
    // Listing cards typically: <article ...> with anchor href "/anuncio/..."
    const articleRe = /<article[\s\S]*?<\/article>/g;
    const matches = html.match(articleRe) ?? [];
    for (const block of matches.slice(0, 30)) {
      const hrefM = block.match(/href="(\/anuncio\/[^"]+)"/);
      if (!hrefM) continue;
      const titleM = block.match(/<(?:h2|h3)[^>]*>([\s\S]*?)<\/(?:h2|h3)>/);
      const priceM = block.match(/€\s*([\d\s.,]+)/);
      const locM = block.match(/<p[^>]*data-cy="listing-item-location"[^>]*>([\s\S]*?)<\/p>/) ||
        block.match(/<p[^>]*location[^>]*>([\s\S]*?)<\/p>/i);
      const roomsM = block.match(/(\d+)\s*quartos?/i);
      const areaM = block.match(/(\d+[\d.,]*)\s*m[²2]/i);
      out.push({
        titulo: titleM ? titleM[1].replace(/<[^>]+>/g, "").trim() : "Imovirtual",
        preco: parseNumber(priceM?.[1]),
        localizacao: locM ? locM[1].replace(/<[^>]+>/g, "").trim() : null,
        area: areaM ? parseNumber(areaM[1]) : null,
        quartos: roomsM ? parseInt(roomsM[1], 10) : null,
        tipo,
        portal: "imovirtual",
        url: `https://www.imovirtual.com${hrefM[1]}`,
      });
    }
  }
  return out;
}

// --- IDEALISTA --- (high block rate, best effort)
async function scrapeIdealista(cfg: Config): Promise<ScrapedListing[]> {
  const out: ScrapedListing[] = [];
  const zona = zonaSlug(cfg.zona) || "portugal";
  for (const tipo of tipoSlugFromConfig(cfg.tipo, "idealista")) {
    let path = `/comprar-casas/${zona}/`;
    if (tipo === "apartamentos") path += "com-apartamentos/";
    else if (tipo === "moradias") path += "com-moradias/";
    if (cfg.preco_max) path = path.replace(/\/$/, `,precio-max_${cfg.preco_max}/`);
    const url = `https://www.idealista.pt${path}`;
    const html = await fetchHtml(url);
    if (!html) continue;
    const itemRe = /<article[^>]*class="[^"]*item[^"]*"[\s\S]*?<\/article>/g;
    const matches = html.match(itemRe) ?? [];
    for (const block of matches.slice(0, 30)) {
      const hrefM = block.match(/href="(\/imovel\/\d+\/?)"/);
      if (!hrefM) continue;
      const titleM = block.match(/<a[^>]*class="item-link"[^>]*>([\s\S]*?)<\/a>/);
      const priceM = block.match(/([\d.]+)\s*€/);
      const detailsM = block.match(/<div class="item-detail-char">([\s\S]*?)<\/div>/);
      const roomsM = detailsM?.[1].match(/(\d+)\s*quartos?/i);
      const areaM = detailsM?.[1].match(/(\d+)\s*m²/);
      out.push({
        titulo: titleM ? titleM[1].replace(/<[^>]+>/g, "").trim() : "Idealista",
        preco: parseNumber(priceM?.[1]),
        localizacao: cfg.zona,
        area: areaM ? parseNumber(areaM[1]) : null,
        quartos: roomsM ? parseInt(roomsM[1], 10) : null,
        tipo: tipo === "apartamentos" ? "apartamento" : "moradia",
        portal: "idealista",
        url: `https://www.idealista.pt${hrefM[1]}`,
      });
    }
  }
  return out;
}

// --- OLX ---
async function scrapeOlx(cfg: Config): Promise<ScrapedListing[]> {
  const out: ScrapedListing[] = [];
  const zona = zonaSlug(cfg.zona);
  for (const tipo of tipoSlugFromConfig(cfg.tipo, "olx")) {
    const params = new URLSearchParams();
    if (cfg.preco_min) params.set("search[filter_float_price:from]", String(cfg.preco_min));
    if (cfg.preco_max) params.set("search[filter_float_price:to]", String(cfg.preco_max));
    const base = `https://www.olx.pt/imoveis/${tipo}/venda/${zona ? zona + "/" : ""}`;
    const url = `${base}?${params.toString()}`;
    const html = await fetchHtml(url);
    if (!html) continue;
    const cardRe = /<div[^>]*data-cy="l-card"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;
    const matches = html.match(cardRe) ?? [];
    for (const block of matches.slice(0, 30)) {
      const hrefM = block.match(/href="(\/d\/anuncio\/[^"]+)"/);
      if (!hrefM) continue;
      const titleM = block.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/);
      const priceM = block.match(/([\d\s.]+)\s*€/);
      const locM = block.match(/data-testid="location-date"[^>]*>([\s\S]*?)</);
      out.push({
        titulo: titleM ? titleM[1].replace(/<[^>]+>/g, "").trim() : "OLX",
        preco: parseNumber(priceM?.[1]),
        localizacao: locM ? locM[1].replace(/<[^>]+>/g, "").trim() : cfg.zona,
        area: null,
        quartos: null,
        tipo,
        portal: "olx",
        url: `https://www.olx.pt${hrefM[1]}`,
      });
    }
  }
  return out;
}

// --- CASA SAPO ---
async function scrapeCasaSapo(cfg: Config): Promise<ScrapedListing[]> {
  const out: ScrapedListing[] = [];
  const zona = zonaSlug(cfg.zona);
  for (const tipo of tipoSlugFromConfig(cfg.tipo, "casasapo")) {
    const params = new URLSearchParams();
    params.set("tr", "1"); // venda
    if (cfg.preco_min) params.set("pmin", String(cfg.preco_min));
    if (cfg.preco_max) params.set("pmax", String(cfg.preco_max));
    if (cfg.quartos_min) params.set("tpmin", String(cfg.quartos_min));
    if (zona) params.set("lo", zona);
    params.set("tp", tipo === "apartamento" ? "1" : "2");
    const url = `https://casa.sapo.pt/Venda/Imoveis/?${params.toString()}`;
    const html = await fetchHtml(url);
    if (!html) continue;
    const propRe = /<div[^>]*class="[^"]*property[^"]*"[\s\S]*?<\/div>\s*<\/div>/g;
    const matches = html.match(propRe) ?? [];
    for (const block of matches.slice(0, 30)) {
      const hrefM = block.match(/href="(https?:\/\/[^"]*casa\.sapo\.pt\/[^"]+)"/);
      if (!hrefM) continue;
      const titleM = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || block.match(/title="([^"]+)"/);
      const priceM = block.match(/([\d\s.]+)\s*€/);
      const areaM = block.match(/(\d+[\d.,]*)\s*m[²2]/i);
      const roomsM = block.match(/T(\d)/);
      out.push({
        titulo: titleM ? titleM[1].replace(/<[^>]+>/g, "").trim() : "Casa Sapo",
        preco: parseNumber(priceM?.[1]),
        localizacao: cfg.zona,
        area: areaM ? parseNumber(areaM[1]) : null,
        quartos: roomsM ? parseInt(roomsM[1], 10) : null,
        tipo,
        portal: "casasapo",
        url: hrefM[1],
      });
    }
  }
  return out;
}

const SCRAPERS: Record<string, (cfg: Config) => Promise<ScrapedListing[]>> = {
  imovirtual: scrapeImovirtual,
  idealista: scrapeIdealista,
  olx: scrapeOlx,
  casasapo: scrapeCasaSapo,
};

export const runScrape = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: cfgRow, error: cfgErr } = await supabase
      .from("config_imoveis")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle();
    if (cfgErr) throw new Error(cfgErr.message);
    if (!cfgRow) {
      return { ok: false, error: "Configura a pesquisa primeiro.", novos: 0, total: 0 };
    }

    const cfg: Config = {
      portais: cfgRow.portais ?? [],
      tipo: cfgRow.tipo,
      preco_min: cfgRow.preco_min ? Number(cfgRow.preco_min) : null,
      preco_max: cfgRow.preco_max ? Number(cfgRow.preco_max) : null,
      quartos_min: cfgRow.quartos_min,
      zona: cfgRow.zona,
    };

    const results: ScrapedListing[] = [];
    const portalStats: Record<string, number> = {};
    for (const p of cfg.portais) {
      const fn = SCRAPERS[p];
      if (!fn) continue;
      try {
        const r = await fn(cfg);
        portalStats[p] = r.length;
        results.push(...r);
      } catch (e) {
        console.error(`[scrape] portal ${p} threw`, e);
        portalStats[p] = -1;
      }
    }

    // Filter client-side again (some portals ignore params)
    const filtered = results.filter((r) => {
      if (cfg.preco_min && r.preco != null && r.preco < cfg.preco_min) return false;
      if (cfg.preco_max && r.preco != null && r.preco > cfg.preco_max) return false;
      if (cfg.quartos_min && r.quartos != null && r.quartos < cfg.quartos_min) return false;
      return true;
    });

    let novos = 0;
    if (filtered.length > 0) {
      // Find existing URLs to count true inserts (unique constraint upsert)
      const urls = filtered.map((f) => f.url);
      const { data: existing } = await supabase
        .from("imoveis")
        .select("url")
        .eq("owner_id", userId)
        .in("url", urls);
      const existingSet = new Set((existing ?? []).map((e) => e.url));

      const toInsert = filtered
        .filter((f) => !existingSet.has(f.url))
        .map((f) => ({ ...f, owner_id: userId }));
      novos = toInsert.length;

      if (toInsert.length > 0) {
        const { error: insErr } = await supabase.from("imoveis").insert(toInsert);
        if (insErr) console.error("[scrape] insert error", insErr);
      }
    }

    await supabase
      .from("config_imoveis")
      .update({ ultima_atualizacao: new Date().toISOString() })
      .eq("owner_id", userId);

    return {
      ok: true,
      novos,
      total: filtered.length,
      portalStats,
    };
  });
