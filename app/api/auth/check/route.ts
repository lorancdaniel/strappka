import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = await cookieStore.get("token");

    console.log("=== SPRAWDZANIE AUTORYZACJI ===");
    console.log("Token znaleziony:", !!token);

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const payload = jwt.verify(
      token.value,
      process.env.JWT_SECRET as string
    ) as {
      id: number;
      name: string;
      role: string;
      exp: number;
    };

    console.log("Token zweryfikowany, payload:", payload);

    return NextResponse.json({ authenticated: true, payload }, { status: 200 });
  } catch (error) {
    console.error("Błąd podczas sprawdzania autoryzacji:", error);
    return NextResponse.json(
      { authenticated: false, error: "Token jest nieprawidłowy" },
      { status: 401 }
    );
  }
}
