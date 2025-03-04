import { NextResponse } from "next/server";

export async function POST() {
  try {
    // W nowej strukturze bazy danych nie ma pola working_hours
    // Zwracamy sukces bez wykonywania zapytania
    console.log(
      "Próba resetowania godzin pracy - pole nie istnieje w nowej strukturze bazy danych"
    );

    return NextResponse.json({
      success: true,
      message: "Operacja resetowania godzin została obsłużona",
    });
  } catch (error) {
    console.error("Błąd podczas resetowania godzin:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas resetowania godzin" },
      { status: 500 }
    );
  }
}
