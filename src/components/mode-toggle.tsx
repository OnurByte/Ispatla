"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const { setTheme } = useTheme();
  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label="Temayı değiştir"
      title="Temayı değiştir"
      onClick={() => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark")}
    >
      <Sun className="hidden dark:block" data-icon="inline-start" aria-hidden="true" />
      <Moon className="dark:hidden" data-icon="inline-start" aria-hidden="true" />
    </Button>
  );
}
