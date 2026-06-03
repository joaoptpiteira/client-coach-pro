import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

const KEY = "privacy_mode";
const Ctx = createContext<{ on: boolean; toggle: () => void }>({ on: false, toggle: () => {} });

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(localStorage.getItem(KEY) === "1");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("privacy-on", on);
  }, [on]);

  const toggle = () => {
    setOn((v) => {
      const next = !v;
      localStorage.setItem(KEY, next ? "1" : "0");
      return next;
    });
  };

  return <Ctx.Provider value={{ on, toggle }}>{children}</Ctx.Provider>;
}

export const usePrivacy = () => useContext(Ctx);

export function PrivacyToggle() {
  const { on, toggle } = usePrivacy();
  return (
    <button
      onClick={toggle}
      aria-label={on ? "Mostrar valores" : "Esconder valores"}
      className="fixed top-3 right-3 z-50 h-9 w-9 rounded-full bg-surface/80 backdrop-blur border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-sm"
    >
      {on ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
}
