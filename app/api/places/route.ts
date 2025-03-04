import { NextResponse } from "next/server";
import db from "@/lib/db";

// GET all places
export async function GET() {
  try {
    console.log("Rozpoczynam pobieranie wszystkich miejsc pracy");

    const query = `
      SELECT p.id, p.name, p.address, 
      (
        SELECT COALESCE(json_agg(up.user_id), '[]'::json)
        FROM user_places up
        WHERE up.place_id = p.id
      ) as employes
      FROM places p
      ORDER BY p.id ASC
    `;

    console.log("Zapytanie SQL:", query);
    const res = await db.query(query);
    console.log(`Pobrano ${res.rows.length} miejsc pracy`);

    // Mapowanie wyników, aby zachować kompatybilność z istniejącym frontendem
    const mappedData = res.rows.map((place) => ({
      id: place.id,
      name: place.name,
      adress: place.address, // Zachowujemy nazwę pola 'adress' dla kompatybilności
      employes: Array.isArray(place.employes) ? place.employes : [],
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

    // Ensure employes is an array
    const employes = Array.isArray(body.employes) ? body.employes : [];

    // Start transaction
    await db.query("BEGIN");

    try {
      // 1. Insert into places table
      const insertPlaceQuery = `
        INSERT INTO places (
          name, 
          address
        ) 
        VALUES ($1, $2) 
        RETURNING *
      `;

      const placeValues = [body.name, body.adress];

      const placeResult = await db.query(insertPlaceQuery, placeValues);
      const newPlace = placeResult.rows[0];

      // 2. Insert employee relationships
      if (employes.length > 0) {
        const insertUserPlacesQuery = `
          INSERT INTO user_places (user_id, place_id)
          SELECT u.id, $1
          FROM unnest($2::int[]) AS u(id)
          ON CONFLICT (user_id, place_id) DO NOTHING
        `;

        await db.query(insertUserPlacesQuery, [newPlace.id, employes]);
      }

      await db.query("COMMIT");

      // Format response to match expected structure
      const responseData = {
        id: newPlace.id,
        name: newPlace.name,
        adress: newPlace.address, // Zachowujemy nazwę pola 'adress' dla kompatybilności
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
    console.error("Błąd podczas dodawania miejsca pracy:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas dodawania miejsca pracy" },
      { status: 500 }
    );
  }
}
