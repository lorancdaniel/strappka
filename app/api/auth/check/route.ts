import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    console.log("=== SPRAWDZANIE AUTORYZACJI ===");
    console.log("Użytkownik znaleziony:", !!user);

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    console.log("Użytkownik zweryfikowany, user:", user);

    return NextResponse.json(
      { authenticated: true, user },
      { status: 200 }
    );
  } catch (error) {
    console.error("Błąd podczas sprawdzania autoryzacji:", error);
    return NextResponse.json(
      { authenticated: false, error: "Token jest nieprawidłowy" },
      { status: 401 }
    );
  }
}
