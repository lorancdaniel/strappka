"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { User, AuthResponse } from "@/types/auth";
import { authService } from "@/services/auth-service";

interface AuthContextType {
  user: User | null;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    authService.checkAuth().then(
      (user) => setUser(user),
      () => setUser(null)
    );
  }, []);

  const login = async (login: string, password: string) => {
    const user = await authService.login(login, password);
    setUser(user);
  };

  const logout = async () => {
    await authService.logout();
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
  if (!context) {
    throw new Error("useAuth musi być używany wewnątrz AuthProvider");
  }
  return context;
}
