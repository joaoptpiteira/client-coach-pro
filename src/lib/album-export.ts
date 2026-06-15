import type { Sticker } from "@/lib/wc26-stickers";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function escapeCsv(v: string | number | null | undefined) {
  const s = v == null ? "" : String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const today = () => new Date().toISOString().slice(0, 10);

export function exportCatalogCsv(stickers: Sticker[]) {
  const header = ["Nº", "Secção", "Equipa", "Cromo", "Especial", "Tenho", "Repetidos"];
  const rows = [...stickers]
    .sort((a, b) => a.number - b.number)
    .map((s) => [
      s.number,
      s.section,
      s.team ?? "",
      s.label,
      s.is_special ? "Sim" : "",
      s.owned >= 1 ? "Sim" : "",
      Math.max(0, s.owned - 1) || "",
    ]);
  const csv = [header, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n");
  // BOM para Excel reconhecer UTF-8
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `album-wc26-${today()}.csv`);
}

export function exportCatalogPdf(stickers: Sticker[]) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const total = stickers.length;
  const owned = stickers.filter((s) => s.owned >= 1).length;
  const missing = total - owned;
  const dups = stickers.reduce((sum, s) => sum + Math.max(0, s.owned - 1), 0);
  const pct = total ? ((owned / total) * 100).toFixed(1) : "0";

  doc.setFontSize(16);
  doc.text("Álbum FIFA World Cup 26™", 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(
    `${owned}/${total} cromos (${pct}%) • Faltam ${missing} • Repetidos ${dups} • ${today()}`,
    40,
    58,
  );
  doc.setTextColor(0);

  const sorted = [...stickers].sort((a, b) => a.number - b.number);
  autoTable(doc, {
    startY: 75,
    head: [["Nº", "Secção", "Equipa", "Cromo", "Tenho", "Rep."]],
    body: sorted.map((s) => [
      s.number,
      s.section,
      s.team ?? "—",
      s.label,
      s.owned >= 1 ? "✓" : "",
      Math.max(0, s.owned - 1) || "",
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 30, 30] },
    columnStyles: {
      0: { cellWidth: 32, halign: "right" },
      1: { cellWidth: 70 },
      2: { cellWidth: 110 },
      4: { cellWidth: 36, halign: "center" },
      5: { cellWidth: 36, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.raw) {
        const raw = data.row.raw as Array<string | number>;
        if (raw[4] !== "✓") data.cell.styles.textColor = [140, 140, 140];
      }
    },
  });

  doc.save(`album-wc26-${today()}.pdf`);
}
