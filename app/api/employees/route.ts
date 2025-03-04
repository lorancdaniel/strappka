import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import db from "@/lib/db";
import { type NextRequest } from "next/server";

export async function GET() {
  try {
    console.log("Rozpoczynam pobieranie pracowników");

    // Pobierz podstawowe dane pracowników
    const query = `
      SELECT 
        id, 
        name, 
        surname, 
        email as login, 
        type_of_user,
        created_at as created,
        phone
      FROM users
      ORDER BY id ASC
    `;

    console.log("Wykonuję zapytanie o pracowników:", query);
    const res = await db.query(query);
    console.log(`Pobrano ${res.rows.length} pracowników`);

    // Pobierz miejsca pracy dla wszystkich pracowników
    const employeeIds = res.rows.map((row) => row.id);
    console.log("ID pracowników:", employeeIds);

    let placesQuery = "";
    let placesParams = [];

    if (employeeIds.length > 0) {
      // Tworzymy parametry dla zapytania IN
      const placeholders = employeeIds
        .map((_, index) => `$${index + 1}`)
        .join(",");
      placesQuery = `
        SELECT up.user_id, p.id as place_id, p.name as place_name, p.address as place_address
        FROM user_places up
        JOIN places p ON up.place_id = p.id
        WHERE up.user_id IN (${placeholders})
      `;
      placesParams = employeeIds;

      console.log("Zapytanie o miejsca pracy:", placesQuery);
      console.log("Parametry zapytania:", placesParams);
    } else {
      console.log("Brak pracowników, pomijam pobieranie miejsc pracy");
    }

    // Mapa miejsc pracy dla każdego pracownika
    const employeePlacesMap: Record<number, string[]> = {};

    if (employeeIds.length > 0) {
      try {
        const placesRes = await db.query(placesQuery, placesParams);
        console.log(`Pobrano ${placesRes.rows.length} powiązań miejsc pracy`);

        // Grupuj miejsca według ID pracownika
        placesRes.rows.forEach((row) => {
          const userId = row.user_id as number;
          if (!employeePlacesMap[userId]) {
            employeePlacesMap[userId] = [];
          }
          const placeName =
            row.place_name || row.place_address || `Miejsce ${row.place_id}`;
          console.log(
            `Dodaję miejsce "${placeName}" dla pracownika ID ${userId}`
          );
          employeePlacesMap[userId].push(placeName);
        });
      } catch (placeError) {
        console.error("Błąd podczas pobierania miejsc pracy:", placeError);
        // Kontynuujemy, aby zwrócić chociaż podstawowe dane pracowników
      }
    }

    // Połącz dane pracowników z ich miejscami pracy
    const data = res.rows.map((row) => {
      const places = employeePlacesMap[row.id] || [];
      console.log(
        `Pracownik ${row.name} ${row.surname} (ID: ${row.id}) ma ${places.length} miejsc pracy`
      );

      return {
        ...row,
        working_hours: 0,
        places: places,
        logs: [],
      };
    });

    console.log("Zwracam dane pracowników");
    return NextResponse.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error("Błąd podczas pobierania pracowników:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Wystąpił błąd podczas pobierania pracowników",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Otrzymane dane:", body);

    // Sprawdź, czy email już istnieje
    const existingUser = await db.query(
      "SELECT id FROM users WHERE email = $1",
      [body.login] // Używamy login jako email
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: "Użytkownik o podanym adresie email już istnieje" },
        { status: 400 }
      );
    }

    // Zahaszuj hasło
    const hashedPassword = await bcrypt.hash(body.password, 10);

    // Główne zapytanie INSERT dostosowane do nowej struktury bazy danych
    const query = `
      INSERT INTO users (
        name, 
        surname, 
        email, 
        password, 
        type_of_user,
        phone
      ) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id, name, surname, email as login, type_of_user, created_at as created, phone
    `;

    const values = [
      body.name,
      body.surname,
      body.login, // Używamy login jako email
      hashedPassword,
      Number(body.type_of_user),
      body.phone ? parseInt(body.phone) : null, // Dodajemy numer telefonu
    ];

    console.log("Zapytanie SQL:", query);
    console.log("Parametry:", values);

    const result = await db.query(query, values);

    // Konwertuj dane wyjściowe i dodaj wartości domyślne dla brakujących pól
    const employee = {
      ...result.rows[0],
      working_hours: 0,
      places: [],
      logs: [],
      type_of_user: Number(result.rows[0].type_of_user),
    };

    return NextResponse.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("Błąd podczas dodawania pracownika:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas dodawania pracownika" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

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

    if (queryParts.length === 0) {
      return NextResponse.json(
        { error: "Brak danych do aktualizacji" },
        { status: 400 }
      );
    }

    const query = `
      UPDATE users 
      SET ${queryParts.join(", ")} 
      WHERE id = $${paramCounter} 
      RETURNING id, name, surname, email as login, type_of_user, created_at as created
    `;

    const id = body.id;
    if (!id) {
      return NextResponse.json(
        { error: "ID pracownika jest wymagane" },
        { status: 400 }
      );
    }
    queryParams.push(id);

    console.log("Zapytanie SQL:", query);
    console.log("Parametry:", queryParams);

    const res = await db.query(query, queryParams);

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Nie znaleziono pracownika" },
        { status: 404 }
      );
    }

    // Konwertuj dane wyjściowe i dodaj wartości domyślne dla brakujących pól
    const employee = {
      ...res.rows[0],
      working_hours: 0,
      places: [],
      logs: [],
      phone: null,
      type_of_user: Number(res.rows[0].type_of_user),
    };

    return NextResponse.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("Błąd podczas aktualizacji pracownika:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas aktualizacji pracownika" },
      { status: 500 }
    );
  }
}
