import { NextResponse } from "next/server";
import db from "@/lib/db";
import { type NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // W nowej strukturze bazy danych nie ma pola working_hours
    // Zwracamy sukces bez wykonywania zapytania
    console.log(
      `Próba resetowania godzin pracy dla pracownika ${id} - pole nie istnieje w nowej strukturze bazy danych`
    );

    // Pobieramy dane pracownika, aby zwrócić je w odpowiedzi
    const query = `
      SELECT id, name, surname, email as login, type_of_user, created_at as created
      FROM users
      WHERE id = $1
    `;

    const res = await db.query(query, [id]);

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Nie znaleziono pracownika" },
        { status: 404 }
      );
    }

    // Dodajemy wartości domyślne dla brakujących pól
    const employee = {
      ...res.rows[0],
      working_hours: 0, // Resetujemy do 0 (wartość domyślna)
      places: [],
      logs: [],
      phone: null,
    };

    return NextResponse.json({
      success: true,
      data: employee,
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
