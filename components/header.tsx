"use client";

import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useTheme } from "@/components/providers/theme-provider";

interface HeaderProps {
  employeeName?: string;
}

export function Header({ employeeName = "Użytkownik" }: HeaderProps) {
  const { currentTheme } = useTheme();

  const currentDate = new Date().toLocaleString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-background border-b shadow-sm shrink-0 gap-4">
      <div className="flex items-center">
        <h1 className="text-lg lg:text-xl font-bold text-foreground">
          {currentDate}
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <ThemeSwitcher />
        <p className="text-sm text-muted-foreground">
          Witaj,{" "}
          <span
            style={{ color: currentTheme.primary }}
            className="font-semibold"
          >
            {employeeName}
          </span>
        </p>
        <Button variant="outline" size="sm" className="transition-colors">
          Wyloguj
        </Button>
      </div>
    </header>
  );
}
