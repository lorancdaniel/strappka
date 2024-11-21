"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "strawberry" | "mint" | "blueberry" | "lavender";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  currentTheme: (typeof themes)[Theme];
  isDark: boolean;
  toggleDark: () => void;
}

export const themes = {
  strawberry: {
    primary: "#FF4646",
    hover: "#FF6B6B",
    bg: "#2D2D2D",
    hoverBg: "rgba(255, 70, 70, 0.1)",
  },
  mint: {
    primary: "#4CAF50",
    hover: "#66BB6A",
    bg: "#2D2D2D",
    hoverBg: "rgba(76, 175, 80, 0.1)",
  },
  blueberry: {
    primary: "#2196F3",
    hover: "#42A5F5",
    bg: "#2D2D2D",
    hoverBg: "rgba(33, 150, 243, 0.1)",
  },
  lavender: {
    primary: "#9C27B0",
    hover: "#AB47BC",
    bg: "#2D2D2D",
    hoverBg: "rgba(156, 39, 176, 0.1)",
  },
} as const;

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>("strawberry");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as Theme;
    const savedDark = localStorage.getItem("darkMode") === "true";

    if (savedTheme && themes[savedTheme]) {
      setTheme(savedTheme);
    }
    setIsDark(savedDark);

    if (savedDark) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const toggleDark = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("darkMode", (!isDark).toString());
  };

  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: updateTheme,
        currentTheme: themes[theme],
        isDark,
        toggleDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
