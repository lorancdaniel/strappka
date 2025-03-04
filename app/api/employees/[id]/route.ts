import { NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcrypt";
import { type NextRequest } from "next/server";

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const body = await request.json();
    console.log("Surowe dane:", body);

    // Rozpocznij transakcję
    await db.query("BEGIN");

    try {
      const queryParts = [];
      const queryParams = [];
      let paramCounter = 1;

      // Handle basic fields
      const basicFields = ["name", "surname"];
      basicFields.forEach((field) => {
        if (body[field] !== undefined) {
          queryParts.push(`${field} = $${paramCounter}`);
          queryParams.push(body[field]);
          paramCounter++;
        }
      });

      // Handle login/email field
      if (body.login !== undefined) {
        queryParts.push(`email = $${paramCounter}`);
        queryParams.push(body.login);
        paramCounter++;
      }

      // Handle password if provided
      if (body.newPassword) {
        const hashedPassword = await bcrypt.hash(body.newPassword, 10);
        queryParts.push(`password = $${paramCounter}`);
        queryParams.push(hashedPassword);
        paramCounter++;
      }

      // Handle type_of_user field
      let type_of_user = body.type_of_user;
      if (type_of_user !== undefined) {
        type_of_user = parseInt(String(type_of_user));
        if (isNaN(type_of_user)) {
          return NextResponse.json(
            { error: "Nieprawidłowy format typu użytkownika" },
            { status: 400 }
          );
        }
        queryParts.push(`type_of_user = $${paramCounter}`);
        queryParams.push(type_of_user);
        paramCounter++;
      }

      // Handle phone field
      if (body.phone !== undefined) {
        if (body.phone === null) {
          queryParts.push(`phone = NULL`);
        } else {
          const phoneValue =
            typeof body.phone === "string"
              ? parseInt(body.phone.replace(/\D/g, ""))
              : body.phone;
          queryParts.push(`phone = $${paramCounter}`);
          queryParams.push(phoneValue);
          paramCounter++;
        }
      }

      if (queryParts.length === 0 && !body.places) {
        return NextResponse.json(
          { error: "Brak danych do aktualizacji" },
          { status: 400 }
        );
      }

      // Aktualizuj dane podstawowe użytkownika
      let employee;
      if (queryParts.length > 0) {
        const query = `
          UPDATE users 
          SET ${queryParts.join(", ")} 
          WHERE id = $${paramCounter} 
          RETURNING id, name, surname, email as login, type_of_user, created_at as created, phone
        `;

        queryParams.push(id);

        console.log("Zapytanie SQL:", query);
        console.log("Parametry:", queryParams);

        const res = await db.query(query, queryParams);

        if (res.rows.length === 0) {
          await db.query("ROLLBACK");
          return NextResponse.json(
            { error: "Nie znaleziono pracownika" },
            { status: 404 }
          );
        }

        employee = res.rows[0];
      } else {
        // Jeśli nie ma podstawowych pól do aktualizacji, pobierz dane pracownika
        const getEmployeeQuery = `
          SELECT id, name, surname, email as login, type_of_user, created_at as created, phone
          FROM users
          WHERE id = $1
        `;
        const employeeRes = await db.query(getEmployeeQuery, [id]);

        if (employeeRes.rows.length === 0) {
          await db.query("ROLLBACK");
          return NextResponse.json(
            { error: "Nie znaleziono pracownika" },
            { status: 404 }
          );
        }

        employee = employeeRes.rows[0];
      }

      // Obsługa miejsc pracy
      if (body.places !== undefined) {
        // Pobierz aktualne miejsca pracy użytkownika
        const currentPlacesQuery = `
          SELECT place_id FROM user_places WHERE user_id = $1
        `;
        const currentPlacesRes = await db.query(currentPlacesQuery, [id]);
        const currentPlaces = currentPlacesRes.rows.map(
          (row: { place_id: number }) => row.place_id
        );

        // Konwertuj nowe miejsca pracy
        const newPlaces = Array.isArray(body.places)
          ? body.places
          : typeof body.places === "string"
          ? body.places
              .split(",")
              .map((p: string) => parseInt(p.trim()))
              .filter((p: number) => !isNaN(p))
          : [];

        console.log("Aktualne miejsca:", currentPlaces);
        console.log("Nowe miejsca:", newPlaces);

        // Usuń miejsca, które nie są już przypisane
        if (currentPlaces.length > 0) {
          const placesToRemove = currentPlaces.filter(
            (p: number) => !newPlaces.includes(p)
          );
          if (placesToRemove.length > 0) {
            const deleteQuery = `
              DELETE FROM user_places 
              WHERE user_id = $1 AND place_id = ANY($2::int[])
            `;
            await db.query(deleteQuery, [id, placesToRemove]);
          }
        }

        // Dodaj nowe miejsca
        if (newPlaces.length > 0) {
          const placesToAdd = newPlaces.filter(
            (p: number) => !currentPlaces.includes(p)
          );
          if (placesToAdd.length > 0) {
            // Sprawdź, czy wszystkie miejsca istnieją
            const checkPlacesQuery = `
              SELECT id FROM places WHERE id = ANY($1::int[])
            `;
            const existingPlacesRes = await db.query(checkPlacesQuery, [
              placesToAdd,
            ]);
            const existingPlaces = existingPlacesRes.rows.map(
              (row: { id: number }) => row.id
            );

            // Filtruj tylko istniejące miejsca
            const validPlacesToAdd = placesToAdd.filter((p: number) =>
              existingPlaces.includes(p)
            );

            if (validPlacesToAdd.length > 0) {
              // Przygotuj wartości do wstawienia
              const values = validPlacesToAdd
                .map((placeId: number) => `(${id}, ${placeId})`)
                .join(", ");

              const insertQuery = `
                INSERT INTO user_places (user_id, place_id)
                VALUES ${values}
                ON CONFLICT (user_id, place_id) DO NOTHING
              `;
              await db.query(insertQuery);
            }
          }
        }

        // Pobierz zaktualizowaną listę miejsc
        const updatedPlacesQuery = `
          SELECT place_id FROM user_places WHERE user_id = $1
        `;
        const updatedPlacesRes = await db.query(updatedPlacesQuery, [id]);
        const updatedPlaces = updatedPlacesRes.rows.map(
          (row: { place_id: number }) => row.place_id
        );

        // Dodaj miejsca do odpowiedzi
        employee.places = updatedPlaces;
      } else {
        // Pobierz aktualne miejsca pracy użytkownika
        const placesQuery = `
          SELECT place_id FROM user_places WHERE user_id = $1
        `;
        const placesRes = await db.query(placesQuery, [id]);
        employee.places = placesRes.rows.map(
          (row: { place_id: number }) => row.place_id
        );
      }

      // Zatwierdź transakcję
      await db.query("COMMIT");

      // Dodajemy wartości domyślne dla brakujących pól
      const completeEmployee = {
        ...employee,
        working_hours: 0,
        logs: [],
      };

      return NextResponse.json({
        success: true,
        data: completeEmployee,
      });
    } catch (error) {
      // Wycofaj transakcję w przypadku błędu
      await db.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Błąd podczas aktualizacji pracownika:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas aktualizacji pracownika" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    console.log(`Pobieranie pracownika o ID: ${id}`);

    // Pobierz podstawowe dane pracownika
    const query = `
      SELECT id, name, surname, email as login, type_of_user, created_at as created, phone
      FROM users
      WHERE id = $1
    `;

    console.log(`Wykonuję zapytanie: ${query}`);
    console.log(`Parametry: [${id}]`);

    const res = await db.query(query, [id]);
    console.log(`Wynik zapytania: ${JSON.stringify(res.rows)}`);

    if (res.rows.length === 0) {
      console.log(`Nie znaleziono pracownika o ID: ${id}`);
      return NextResponse.json(
        { error: "Nie znaleziono pracownika" },
        { status: 404 }
      );
    }

    // Pobierz miejsca pracy pracownika
    const placesQuery = `
      SELECT place_id FROM user_places WHERE user_id = $1
    `;
    console.log(`Wykonuję zapytanie o miejsca pracy: ${placesQuery}`);
    console.log(`Parametry: [${id}]`);

    const placesRes = await db.query(placesQuery, [id]);
    console.log(
      `Wynik zapytania o miejsca pracy: ${JSON.stringify(placesRes.rows)}`
    );

    const places = placesRes.rows.map(
      (row: { place_id: number }) => row.place_id
    );
    console.log(`Miejsca pracy pracownika: ${JSON.stringify(places)}`);

    // Dodajemy wartości domyślne dla brakujących pól
    const employee = {
      ...res.rows[0],
      working_hours: 0,
      places: places,
      logs: [],
    };
    console.log(`Przygotowane dane pracownika: ${JSON.stringify(employee)}`);

    return NextResponse.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("Błąd podczas pobierania pracownika:", error);
    console.error(
      "Szczegóły błędu:",
      error instanceof Error ? error.message : String(error)
    );
    console.error(
      "Stack trace:",
      error instanceof Error ? error.stack : "Brak stack trace"
    );

    return NextResponse.json(
      {
        success: false,
        error: "Wystąpił błąd podczas pobierania pracownika",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;

    // Sprawdź, czy pracownik istnieje
    const checkQuery = `SELECT id FROM users WHERE id = $1`;
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Nie znaleziono pracownika" },
        { status: 404 }
      );
    }

    // Usuń pracownika
    const deleteQuery = `DELETE FROM users WHERE id = $1`;
    await db.query(deleteQuery, [id]);

    return NextResponse.json({
      success: true,
      message: "Pracownik został usunięty",
    });
  } catch (error) {
    console.error("Błąd podczas usuwania pracownika:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas usuwania pracownika" },
      { status: 500 }
    );
  }
}
