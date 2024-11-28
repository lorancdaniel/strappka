import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import db from "@/lib/db";

export async function GET() {
  try {
    const query = `
      SELECT id, name, surname, login, COALESCE(working_hours, 0) as working_hours, 
      places, type_of_user, created, logs
      FROM users
      ORDER BY id ASC
    `;

    const res = await db.query(query);

    return NextResponse.json({
      success: true,
      data: res.rows,
    });
  } catch (error) {
    console.error("Błąd podczas pobierania pracowników:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania pracowników" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, surname, login, password, type_of_user } =
      await request.json();

    // Check if user already exists
    const existingUser = await db.query(
      "SELECT * FROM users WHERE login = $1",
      [login]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: "Użytkownik o podanym loginie już istnieje" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await db.query(
      `INSERT INTO users (name, surname, login, password, type_of_user) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, surname, login, type_of_user`,
      [name, surname, login, hashedPassword, type_of_user]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas dodawania pracownika" },
      { status: 500 }
    );
  }
}

export async function createEmployee(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const query =
      "UPDATE users SET working_hours = 0 WHERE id = $1 RETURNING *";
    const res = await db.query(query, [params.id]);

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Nie znaleziono pracownika" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: res.rows[0],
    });
  } catch (error) {
    console.error("Błąd podczas resetowania godzin pracownika:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas resetowania godzin" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    console.log("Surowe dane:", body);

    // Walidacja i konwersja working_hours na numeric
    let working_hours = body.working_hours;
    if (working_hours !== undefined) {
      working_hours = Number(working_hours);
      if (isNaN(working_hours)) {
        console.error(
          "Nieprawidłowa wartość working_hours:",
          body.working_hours
        );
        return NextResponse.json(
          { error: "Nieprawidłowy format godzin pracy" },
          { status: 400 }
        );
      }
    }

    // Walidacja i konwersja places
    let places = body.places;
    if (places !== undefined && !Array.isArray(places)) {
      places = [places];
    }

    // Walidacja i konwersja type_of_user
    let type_of_user = body.type_of_user;
    if (type_of_user !== undefined) {
      type_of_user = parseInt(String(type_of_user));
      if (isNaN(type_of_user)) {
        return NextResponse.json(
          { error: "Nieprawidłowy format typu użytkownika" },
          { status: 400 }
        );
      }
    }

    const queryParts = [];
    const queryParams = [];
    let paramCounter = 1;

    if (working_hours !== undefined) {
      queryParts.push(`working_hours = $${paramCounter}::numeric`);
      queryParams.push(working_hours);
      paramCounter++;
    }

    if (places !== undefined) {
      queryParts.push(`places = $${paramCounter}`);
      queryParams.push(places);
      paramCounter++;
    }

    if (type_of_user !== undefined) {
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

    let query = `
      UPDATE users 
      SET ${queryParts.join(", ")}
    `;

    // Jeśli podano nowe hasło, dodaj je do zapytania
    if (body.newPassword) {
      const hashedPassword = await bcrypt.hash(body.newPassword, 10);
      query += `, password = $${paramCounter}`;
      queryParams.push(hashedPassword);
      paramCounter++;
    }

    query += ` WHERE id = $${paramCounter} RETURNING *`;
    const id = parseInt(String(params.id));
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Nieprawidłowe ID pracownika" },
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

    return NextResponse.json({
      success: true,
      data: res.rows[0],
    });
  } catch (error) {
    console.error("Błąd podczas aktualizacji pracownika:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas aktualizacji pracownika" },
      { status: 500 }
    );
  }
}
