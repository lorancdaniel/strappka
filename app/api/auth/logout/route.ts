import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  try {
    // Usuń ciasteczko autoryzacyjne
    const response = NextResponse.json(
      { message: "Wylogowano pomyślnie" },
      { status: 200 }
    );

    // Ustawienie ciasteczka z datą wygaśnięcia w przeszłości, co efektywnie je usuwa
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: "",
      expires: new Date(0),
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Błąd podczas wylogowywania:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd serwera" },
      { status: 500 }
    );
  }
}
