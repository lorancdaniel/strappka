import { NextResponse } from "next/server";
import db from "@/lib/db";
import { type NextRequest } from "next/server";

// GET single place
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const placeId = parseInt(id, 10);

    if (isNaN(placeId)) {
      return NextResponse.json(
        { error: "Nieprawidłowe ID miejsca pracy" },
        { status: 400 }
      );
    }

    const query = `
      SELECT id, name, adress, employes
      FROM places 
      WHERE id = $1
    `;

    const res = await db.query(query, [placeId]);

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Nie znaleziono miejsca pracy" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: res.rows[0],
    });
  } catch (error) {
    console.error("Błąd podczas pobierania miejsca pracy:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania miejsca pracy" },
      { status: 500 }
    );
  }
}

// PUT (update) place
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const placeId = parseInt(id, 10);
    const body = await request.json();

    if (isNaN(placeId)) {
      return NextResponse.json(
        { error: "Nieprawidłowe ID miejsca pracy" },
        { status: 400 }
      );
    }

    if (!body.name || !body.adress) {
      return NextResponse.json(
        { error: "Nazwa i adres są wymagane" },
        { status: 400 }
      );
    }

    // Ensure employes is an array
    const employes = Array.isArray(body.employes) ? body.employes : [];

    const query = `
      UPDATE places
      SET name = $1, adress = $2, employes = $3
      WHERE id = $4
      RETURNING *
    `;

    const res = await db.query(query, [body.name, body.adress, employes, placeId]);

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Nie znaleziono miejsca pracy" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: res.rows[0],
    });
  } catch (error) {
    console.error("Błąd podczas aktualizacji miejsca pracy:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas aktualizacji miejsca pracy" },
      { status: 500 }
    );
  }
}

// DELETE place
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const placeId = parseInt(id, 10);

    if (isNaN(placeId)) {
      return NextResponse.json(
        { error: "Nieprawidłowe ID miejsca pracy" },
        { status: 400 }
      );
    }

    const query = `
      DELETE FROM places
      WHERE id = $1
      RETURNING *
    `;

    const res = await db.query(query, [placeId]);

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Nie znaleziono miejsca pracy" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Miejsce pracy zostało usunięte",
    });
  } catch (error) {
    console.error("Błąd podczas usuwania miejsca pracy:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas usuwania miejsca pracy" },
      { status: 500 }
    );
  }
}
