import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as jose from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "twoj_tajny_klucz_jwt"
);

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("token");

    console.log("=== SPRAWDZANIE AUTORYZACJI ===");
    console.log("Token znaleziony:", !!token);

    if (!token) {
      return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });
    }

    const { payload } = await jose.jwtVerify(token.value, JWT_SECRET);
    console.log("Token zweryfikowany, payload:", payload);

    return NextResponse.json({
      user: {
        id: payload.id,
        name: payload.name,
        role: payload.role,
      },
    });
  } catch (error) {
    console.error("Błąd weryfikacji tokenu:", error);
    return NextResponse.json({ error: "Nieprawidłowy token" }, { status: 401 });
  }
}
