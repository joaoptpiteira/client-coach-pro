import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  value: string;
  onChange: (next: string) => void;
  label: string;
}

export function MonthNavigator({ value, onChange, label }: Props) {
  const shift = (delta: number) => {
    const [y, m] = value.split("-").map(Number);
    const d = new Date(y, (m ?? 1) - 1 + delta, 1);
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  return (
    <div className="flex items-center justify-between bg-surface border border-border rounded-xl px-2 py-1.5">
      <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Mês anterior">
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <p className="font-display text-base capitalize">{label}</p>
      <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Mês seguinte">
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
