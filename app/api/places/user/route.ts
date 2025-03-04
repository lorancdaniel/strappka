import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import db from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    console.log("Rozpoczynam pobieranie miejsc pracy");

    const token = request.cookies.get("token")?.value;
    if (!token) {
      console.log("Brak tokenu w ciasteczkach");
      return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      console.log("Nieprawidłowy token lub brak ID użytkownika");
      return NextResponse.json(
        { error: "Nieprawidłowy token" },
        { status: 401 }
      );
    }

    console.log("ID zalogowanego użytkownika:", payload.id);
    console.log("Typ użytkownika:", payload.type_of_user);

    let query: string;
    let params: unknown[];

    // Dla administratorów pobierz wszystkie miejsca
    if (payload.type_of_user === 1) {
      query = `
        SELECT p.id, p.name, p.address
        FROM places p
        ORDER BY p.name ASC
      `;
      params = [];
      console.log("Pobieranie wszystkich miejsc dla administratora");
    } else {
      // Dla zwykłych użytkowników pobierz tylko przypisane miejsca
      query = `
        SELECT p.id, p.name, p.address
        FROM places p
        JOIN user_places up ON p.id = up.place_id
        WHERE up.user_id = $1
        ORDER BY p.name ASC
      `;
      params = [payload.id];
      console.log(
        "Pobieranie przypisanych miejsc dla użytkownika:",
        payload.id
      );
    }

    console.log("Zapytanie SQL:", query);
    console.log("Parametry:", params);

    const placesResult = await db.query(query, params);
    console.log("Liczba pobranych miejsc:", placesResult.rows.length);
    console.log("Pobrane miejsca pracy:", placesResult.rows);

    // Mapowanie wyników, aby zachować kompatybilność z istniejącym frontendem
    const mappedData = placesResult.rows.map((place) => ({
      id: place.id,
      name: place.name,
      adress: place.address, // Zachowujemy nazwę pola 'adress' dla kompatybilności
    }));

    console.log("Zmapowane dane:", mappedData);

    return NextResponse.json({
      success: true,
      data: mappedData,
    });
  } catch (error) {
    console.error("Błąd podczas pobierania miejsc pracy:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Wystąpił błąd podczas pobierania miejsc pracy",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
