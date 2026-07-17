"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full border-border"
        disabled
      >
        Tema
      </Button>
    );
  }

  const isDark = theme !== "light";

  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full justify-between border-border px-4"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      <span className="flex items-center gap-2">
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        {isDark ? "Modo claro" : "Modo escuro"}
      </span>
      <span className="font-display text-xs tracking-[0.16em] text-muted-foreground">
        {isDark ? "CLARO" : "ESCURO"}
      </span>
    </Button>
  );
}
