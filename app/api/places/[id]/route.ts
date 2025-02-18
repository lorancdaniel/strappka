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

    // Start transaction
    await db.query('BEGIN');

    try {
      // 1. Update place
      const updatePlaceQuery = `
        UPDATE places
        SET name = $1, adress = $2, employes = $3
        WHERE id = $4
        RETURNING *
      `;
      const placeRes = await db.query(updatePlaceQuery, [body.name, body.adress, employes, placeId]);

      if (placeRes.rows.length === 0) {
        await db.query('ROLLBACK');
        return NextResponse.json(
          { error: "Nie znaleziono miejsca pracy" },
          { status: 404 }
        );
      }

      // 2. Update users' places arrays
      // First, get all users that have this place in their places array
      const getUsersQuery = `
        SELECT id, places 
        FROM users 
        WHERE $1 = ANY(places)
      `;
      const currentUsersRes = await db.query(getUsersQuery, [placeId]);
      
      // Remove this place from users that are no longer employed here
      const removeFromUsersQuery = `
        UPDATE users 
        SET places = array_remove(places, $1)
        WHERE $1 = ANY(places) AND NOT (id = ANY($2::int[]))
      `;
      await db.query(removeFromUsersQuery, [placeId, employes]);

      // Add this place to new employees
      const addToUsersQuery = `
        UPDATE users 
        SET places = array_append(places, $1)
        WHERE id = ANY($2::int[]) 
        AND NOT ($1 = ANY(places))
      `;
      await db.query(addToUsersQuery, [placeId, employes]);

      await db.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: placeRes.rows[0],
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
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
