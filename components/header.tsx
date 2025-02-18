"use client";

import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useTheme } from "@/components/providers/theme-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface HeaderProps {
  employeeName?: string;
}

export function Header({ employeeName = "Użytkownik" }: HeaderProps) {
  const [currentDate, setCurrentDate] = useState<string>("");
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleString("pl-PL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="flex flex-col justify-center items-center sm:flex-row sm:justify-between sm:items-center p-4 bg-background border-b shadow-sm shrink-0 gap-4">
      <div className="flex items-center justify-center w-full sm:w-auto">
        <h1 className="text-lg lg:text-xl font-bold text-foreground">
          {currentDate}
        </h1>
      </div>
      <div className="flex flex-wrap items-center justify-center w-full sm:w-auto gap-4">
        <ThemeSwitcher />
        <p className="text-sm text-muted-foreground">
          Witaj,{" "}
          <span className="font-semibold text-primary">{employeeName}</span>
        </p>
        <Button
          variant="outline"
          size="sm"
          className="transition-colors"
          onClick={handleLogout}
        >
          Wyloguj
        </Button>
      </div>
    </header>
  );
}
