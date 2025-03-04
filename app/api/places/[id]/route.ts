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
      SELECT p.id, p.name, p.address, 
      (
        SELECT COALESCE(json_agg(up.user_id), '[]'::json)
        FROM user_places up
        WHERE up.place_id = p.id
      ) as employes
      FROM places p
      WHERE p.id = $1
    `;

    const res = await db.query(query, [placeId]);

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Nie znaleziono miejsca pracy" },
        { status: 404 }
      );
    }

    // Mapowanie wyników, aby zachować kompatybilność z istniejącym frontendem
    const place = res.rows[0];
    const mappedData = {
      id: place.id,
      name: place.name,
      adress: place.address, // Zachowujemy nazwę pola 'adress' dla kompatybilności
      employes: Array.isArray(place.employes) ? place.employes : [],
    };

    return NextResponse.json({
      success: true,
      data: mappedData,
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
    await db.query("BEGIN");

    try {
      // 1. Update place
      const updatePlaceQuery = `
        UPDATE places
        SET name = $1, address = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;
      const placeRes = await db.query(updatePlaceQuery, [
        body.name,
        body.adress,
        placeId,
      ]);

      if (placeRes.rows.length === 0) {
        await db.query("ROLLBACK");
        return NextResponse.json(
          { error: "Nie znaleziono miejsca pracy" },
          { status: 404 }
        );
      }

      // 2. Delete all existing user_places relationships for this place
      const deleteUserPlacesQuery = `
        DELETE FROM user_places
        WHERE place_id = $1
      `;
      await db.query(deleteUserPlacesQuery, [placeId]);

      // 3. Add new user_places relationships
      if (employes.length > 0) {
        const insertUserPlacesQuery = `
          INSERT INTO user_places (user_id, place_id)
          SELECT u.id, $1
          FROM unnest($2::int[]) AS u(id)
          ON CONFLICT (user_id, place_id) DO NOTHING
        `;
        await db.query(insertUserPlacesQuery, [placeId, employes]);
      }

      await db.query("COMMIT");

      // Format response to match expected structure
      const responseData = {
        id: placeRes.rows[0].id,
        name: placeRes.rows[0].name,
        adress: placeRes.rows[0].address, // Zachowujemy nazwę pola 'adress' dla kompatybilności
        employes: employes,
      };

      return NextResponse.json({
        success: true,
        data: responseData,
      });
    } catch (error) {
      await db.query("ROLLBACK");
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

    // Start transaction
    await db.query("BEGIN");

    try {
      // 1. Delete all user_places relationships for this place
      await db.query("DELETE FROM user_places WHERE place_id = $1", [placeId]);

      // 2. Delete the place
      const query = `
        DELETE FROM places
        WHERE id = $1
        RETURNING *
      `;

      const res = await db.query(query, [placeId]);

      if (res.rows.length === 0) {
        await db.query("ROLLBACK");
        return NextResponse.json(
          { error: "Nie znaleziono miejsca pracy" },
          { status: 404 }
        );
      }

      await db.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: "Miejsce pracy zostało usunięte",
      });
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Błąd podczas usuwania miejsca pracy:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas usuwania miejsca pracy" },
      { status: 500 }
    );
  }
}
