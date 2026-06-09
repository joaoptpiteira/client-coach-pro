/** Variação percentual segura entre valor atual e anterior. */
export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** Projeção linear: extrapola um valor parcial até ao fim do mês. */
export function projectToEndOfMonth(partial: number, ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  const now = new Date();
  const sameMonth =
    now.getFullYear() === y && now.getMonth() + 1 === m;
  if (!sameMonth) return partial;
  const daysInMonth = new Date(y, m, 0).getDate();
  const dayOfMonth = now.getDate();
  if (dayOfMonth <= 0) return partial;
  return (partial / dayOfMonth) * daysInMonth;
}

/** Quantos dias passaram desde uma data ISO (YYYY-MM-DD). */
export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const then = new Date(y, (m ?? 1) - 1, d ?? 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  then.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - then.getTime()) / 86_400_000);
}

/** Link wa.me a partir de um telefone PT (limpa espaços, adiciona 351 se necessário). */
export function whatsappLink(phone: string | null | undefined, msg: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const withCountry = digits.startsWith("351") || digits.length > 9 ? digits : `351${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(msg)}`;
}

export function fmtDelta(pct: number | null): string {
  if (pct === null) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}%`;
}
