import { User, AuthResponse } from "@/types/auth";

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

    return data.user;
  }

  async logout(): Promise<void> {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  }

  async checkAuth(): Promise<User> {
    const res = await fetch("/api/auth/check", {
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Nie zalogowano");
    }

    const data: AuthResponse = await res.json();
    return data.user;
  }
}

export const authService = new AuthService();
