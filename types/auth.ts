export interface DatabaseUser {
  id: number;
  name: string;
  surname: string;
  email: string;
  type_of_user: number;
}

export interface User {
  id: number;
  name: string;
  role: "admin" | "user";
}

export interface AuthResponse {
  user: User;
  token?: string;
  error?: string;
}
