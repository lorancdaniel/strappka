import { User, AuthResponse } from "@/types/auth";
import { TokenService } from "./token-service";

class AuthService {
  async login(login: string, password: string): Promise<User> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ login, password }),
    });

    const data: AuthResponse = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Błąd logowania");
    }

    if (data.token) {
      TokenService.setToken(data.token);
    }

    return data.user;
  }

  async logout(): Promise<void> {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: TokenService.getAuthHeaders(),
      });
    } finally {
      TokenService.removeToken();
    }
  }

  async checkAuth(): Promise<User> {
    const res = await fetch("/api/auth/check", {
      credentials: "include",
      headers: TokenService.getAuthHeaders(),
    });

    if (!res.ok) {
      TokenService.removeToken();
      throw new Error("Nie zalogowano");
    }

    const data: AuthResponse = await res.json();
    
    if (data.token) {
      TokenService.setToken(data.token);
    }
    
    return data.user;
  }
}

export const authService = new AuthService();
