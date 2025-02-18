import { NextResponse } from "next/server";
import db from "@/lib/db";

// GET all places
export async function GET() {
  try {
    const query = `
      SELECT id, name, adress, employes
      FROM places
      ORDER BY id ASC
    `;

    const res = await db.query(query);

    return NextResponse.json({
      success: true,
      data: res.rows,
    });
  } catch (error) {
    console.error("Błąd podczas pobierania miejsc pracy:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania miejsc pracy" },
      { status: 500 }
    );
  }
}

// POST new place
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Otrzymane dane:", body);

    // Validate required fields
    if (!body.name || !body.adress) {
      return NextResponse.json(
        { error: "Nazwa i adres są wymagane" },
        { status: 400 }
      );
    }

    // Get the next ID
    const idResult = await db.query(
      "SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM places"
    );
    const nextId = idResult.rows[0].next_id;

    // Ensure employes is an array
    const employes = Array.isArray(body.employes) ? body.employes : [];

    const query = `
      INSERT INTO places (
        id,
        name, 
        adress, 
        employes
      ) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `;

    const values = [
      nextId,
      body.name,
      body.adress,
      employes,
    ];

    console.log("Zapytanie SQL:", query);
    console.log("Parametry:", values);

    const result = await db.query(query, values);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Błąd podczas dodawania miejsca pracy:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas dodawania miejsca pracy" },
      { status: 500 }
    );
  }
}
