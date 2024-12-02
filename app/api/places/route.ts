import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const query = `
      SELECT id, name, adress, employes
      FROM places
      ORDER BY name ASC
    `;

    const result = await db.query(query);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching places:", error);
    return NextResponse.json(
      { success: false, error: "Nie udało się pobrać listy miejsc" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, adress } = body;

    if (!name || !adress) {
      return NextResponse.json(
        { success: false, error: "Nazwa i adres są wymagane" },
        { status: 400 }
      );
    }

    // Check if a place with the same name already exists
    const existingPlace = await db.query(
      "SELECT id FROM places WHERE name = $1",
      [name]
    );

    if (existingPlace.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: "Miejsce o podanej nazwie już istnieje" },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO places (id, name, adress, employes)
      VALUES (
        COALESCE((SELECT MAX(id) + 1 FROM places), 1),
        $1,
        $2,
        $3
      )
      RETURNING *
    `;

    const values = [name, adress, []];
    const result = await db.query(query, values);

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Error creating place:", error);
    return NextResponse.json(
      { success: false, error: "Nie udało się utworzyć miejsca" },
      { status: 500 }
    );
  }
}
