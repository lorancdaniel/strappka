export interface User {
  id: number;
  name: string;
  role: "admin" | "user";
}

export interface AuthResponse {
  user: User;
  error?: string;
}
