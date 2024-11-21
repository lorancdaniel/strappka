"use client";

import { createContext, useContext, useState } from "react";
import { User } from "@/types/auth";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    // Tutaj normalnie byłoby API call, na razie mock:
    if (email === "admin@example.com" && password === "admin") {
      setUser({
        id: "1",
        email: "admin@example.com",
        name: "Jan Kowalski",
        role: "admin",
      });
    } else if (email === "user@example.com" && password === "user") {
      setUser({
        id: "2",
        email: "user@example.com",
        name: "Anna Nowak",
        role: "user",
      });
    } else {
      throw new Error("Nieprawidłowe dane logowania");
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
