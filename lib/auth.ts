import { cookies } from "next/headers";
import * as jose from "jose";
import { User } from "@/types/auth";

export const AUTH_COOKIE_NAME = "token";
export const AUTH_COOKIE_MAX_AGE = 3600; // 1 hour
export const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your_secure_jwt_secret"
);

export async function generateToken(user: User) {
  return await new jose.SignJWT({
    id: user.id,
    name: user.name,
    role: user.type_of_user === 1 ? "admin" : "user",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

export function getTokenFromCookies() {
  const cookieStore = cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value;
}

export async function getCurrentUser(): Promise<User | null> {
  const token = getTokenFromCookies();
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return {
    id: payload.id as number,
    name: payload.name as string,
    role: payload.role as string,
  };
}
