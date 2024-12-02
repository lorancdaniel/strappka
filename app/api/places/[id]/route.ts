import { NextResponse } from "next/server";
import db from "@/lib/db";

// GET single place
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
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
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { params } = context;
    const body = await request.json();

    const queryParts = [];
    const queryParams = [];
    let paramCounter = 1;

    // Handle basic fields
    const basicFields = ['name', 'adress'];
    basicFields.forEach(field => {
      if (body[field] !== undefined) {
        queryParts.push(`${field} = $${paramCounter}`);
        queryParams.push(body[field]);
        paramCounter++;
      }
    });

    // Handle employes array
    if (body.employes !== undefined) {
      queryParts.push(`employes = $${paramCounter}`);
      queryParams.push(Array.isArray(body.employes) ? body.employes : []);
      paramCounter++;
    }

    if (queryParts.length === 0) {
      return NextResponse.json(
        { error: "Brak danych do aktualizacji" },
        { status: 400 }
      );
    }

    const query = `
      UPDATE places 
      SET ${queryParts.join(", ")} 
      WHERE id = $${paramCounter} 
      RETURNING *
    `;

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Nieprawidłowe ID miejsca pracy" },
        { status: 400 }
      );
    }
    queryParams.push(id);

    console.log("Zapytanie SQL:", query);
    console.log("Parametry:", queryParams);

    const res = await db.query(query, queryParams);

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
  request: Request,
  context: { params: { id: string } }
) {
  const { params } = context;

  try {
    const query = "DELETE FROM places WHERE id = $1 RETURNING *";
    const res = await db.query(query, [params.id]);

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
    console.error("Błąd podczas usuwania miejsca pracy:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas usuwania miejsca pracy" },
      { status: 500 }
    );
  }
}
