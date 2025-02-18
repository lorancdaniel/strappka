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
      return NextResponse.json(
        { error: "Brak autoryzacji" },
        { status: 401 }
      );
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

    // Najpierw pobierz informacje o użytkowniku
    const userQuery = "SELECT places FROM users WHERE id = $1";
    const userResult = await db.query(userQuery, [payload.id]);
    console.log("Przypisane miejsca pracy (IDs):", userResult.rows[0]?.places);

    // Pobierz miejsca pracy przypisane do użytkownika
    const query = `
      SELECT p.id, p.name, p.adress, p.employes
      FROM places p 
      INNER JOIN users u ON p.id = ANY(u.places) 
      WHERE u.id = $1
      ORDER BY p.id ASC
    `;

    const userPlaces = await db.query(query, [payload.id]);
    console.log("Pobrane miejsca pracy:", userPlaces.rows);

    return NextResponse.json({
      success: true,
      data: userPlaces.rows
    });
    
  } catch (error) {
    console.error("Błąd podczas pobierania miejsc pracy:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania miejsc pracy" },
      { status: 500 }
    );
  }
}
