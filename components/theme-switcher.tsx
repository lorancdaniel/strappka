"use client";

import { Button } from "@/components/ui/button";
import { useTheme, themes } from "@/components/providers/theme-provider";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div
          className="w-4 h-4 rounded-full"
          style={{
            backgroundColor: themes[theme].primary,
          }}
        />
        <span className="text-sm text-muted-foreground">Motyw</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </Button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-2 flex bg-card border rounded-md shadow-lg p-2 gap-2 z-50"
        >
          {(Object.keys(themes) as Array<keyof typeof themes>).map(
            (themeName) => (
              <button
                key={themeName}
                className={`w-8 h-8 rounded-full transition-all ${
                  theme === themeName
                    ? "ring-2 ring-offset-2"
                    : "hover:scale-110"
                }`}
                style={{
                  backgroundColor: themes[themeName].primary,
                }}
                onClick={() => {
                  setTheme(themeName);
                  setIsOpen(false);
                }}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
