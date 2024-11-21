"use client";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/providers/theme-provider";
import { Sun, Moon } from "lucide-react";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="flex items-center gap-2"
    >
      {theme === "light" ? (
        <>
          <Sun className="h-4 w-4" />
          <span className="text-sm">Jasny</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          <span className="text-sm">Ciemny</span>
        </>
      )}
    </Button>
  );
}
