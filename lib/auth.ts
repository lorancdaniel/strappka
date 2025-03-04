import { cookies } from "next/headers";
import * as jose from "jose";
import { DatabaseUser, User } from "@/types/auth";

export const AUTH_COOKIE_NAME = "token";
export const AUTH_COOKIE_MAX_AGE = 3600; // 1 hour
export const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your_secure_jwt_secret"
);

export async function generateToken(user: DatabaseUser) {
  return await new jose.SignJWT({
    id: user.id,
    name: `${user.name} ${user.surname}`,
    role: user.type_of_user === 1 ? "admin" : "user",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    console.log("Weryfikuję token JWT...");
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    console.log("Token zweryfikowany pomyślnie");
    return payload;
  } catch (error) {
    console.error("Błąd weryfikacji tokenu:", error);
    return null;
  }
}

export async function getTokenFromCookies() {
  console.log("Pobieram token z ciasteczek...");
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  console.log(`Token znaleziony: ${!!token}`);
  return token;
}

export async function getCurrentUser(): Promise<User | null> {
  console.log("Pobieram dane bieżącego użytkownika...");
  const token = await getTokenFromCookies();
  if (!token) {
    console.log("Brak tokenu w ciasteczkach");
    return null;
  }

  const payload = await verifyToken(token);
  if (!payload) {
    console.log("Token jest nieprawidłowy");
    return null;
  }

  console.log("Tworzę obiekt użytkownika na podstawie tokenu");
  return {
    id: payload.id as number,
    name: payload.name as string,
    role: (payload.role as string) === "admin" ? "admin" : "user",
  };
}
