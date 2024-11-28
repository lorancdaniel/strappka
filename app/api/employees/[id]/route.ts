import { NextResponse } from "next/server";
import db from "@/lib/db";
import { headers } from "next/headers";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    console.log("Surowe dane:", body);

    // If login is being updated, check for duplicates
    if (body.login) {
      const checkLogin = await db.query(
        "SELECT id FROM users WHERE login = $1 AND id != $2",
        [body.login, params.id]
      );

      if (checkLogin.rows.length > 0) {
        return NextResponse.json(
          { error: "Ten login jest już zajęty" },
          { status: 400 }
        );
      }
    }

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
      type_of_user = parseInt(String(type_of_user), 10);
      if (isNaN(type_of_user)) {
        return NextResponse.json(
          { error: "Nieprawidłowy format typu użytkownika" },
          { status: 400 }
        );
      }
    }

    const queryParts: string[] = [];
    const queryParams: any[] = [];
    let paramCounter = 1;

    if (body.name !== undefined) {
      queryParts.push(`name = $${paramCounter}`);
      queryParams.push(body.name);
      paramCounter++;
    }

    if (body.surname !== undefined) {
      queryParts.push(`surname = $${paramCounter}`);
      queryParams.push(body.surname);
      paramCounter++;
    }

    if (body.login !== undefined) {
      queryParts.push(`login = $${paramCounter}`);
      queryParams.push(body.login);
      paramCounter++;
    }

    if (type_of_user !== undefined) {
      queryParts.push(`type_of_user = $${paramCounter}`);
      queryParams.push(type_of_user);
      paramCounter++;
    }

    if (places !== undefined) {
      queryParts.push(`places = $${paramCounter}`);
      queryParams.push(places);
      paramCounter++;
    }

    if (working_hours !== undefined) {
      queryParts.push(`working_hours = $${paramCounter}::numeric`);
      queryParams.push(working_hours);
      paramCounter++;
    }

    // Handle password update if provided
    if (body.newPassword && body.newPassword.trim() !== "") {
      try {
        const hashedPassword = await bcrypt.hash(body.newPassword, 10);
        queryParts.push(`password = $${paramCounter}`);
        queryParams.push(hashedPassword);
        paramCounter++;
      } catch (error) {
        console.error("Error hashing password:", error);
        return NextResponse.json(
          { error: "Błąd podczas hashowania hasła" },
          { status: 500 }
        );
      }
    }

    // Jeśli nie ma żadnych pól do aktualizacji, zwróć błąd
    if (queryParts.length === 0) {
      return NextResponse.json(
        { error: "Brak danych do aktualizacji" },
        { status: 400 }
      );
    }

    // Dodaj ID jako ostatni parametr
    queryParams.push(params.id);

    const query = `
      UPDATE users 
      SET ${queryParts.join(", ")}
      WHERE id = $${paramCounter}
      RETURNING *
    `;

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

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const employeeId = parseInt(id, 10);

    if (isNaN(employeeId)) {
      return NextResponse.json(
        { error: "Nieprawidłowe ID pracownika" },
        { status: 400 }
      );
    }

    const query = `
      SELECT id, name, surname, login, 
      COALESCE(working_hours, 0) as working_hours,
      places, type_of_user, created, logs
      FROM users 
      WHERE id = $1
    `;

    const res = await db.query(query, [employeeId]);

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
    console.error("Błąd podczas pobierania pracownika:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania pracownika" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const employeeId = parseInt(params.id);
    if (isNaN(employeeId)) {
      return NextResponse.json(
        { error: "Nieprawidłowe ID pracownika" },
        { status: 400 }
      );
    }

    // First check if employee is an admin before allowing deletion
    const checkAdmin = await db.query(
      "SELECT type_of_user FROM users WHERE id = $1",
      [employeeId]
    );

    if (checkAdmin.rows.length === 0) {
      return NextResponse.json(
        { error: "Nie znaleziono pracownika" },
        { status: 404 }
      );
    }

    // If user is admin, block deletion
    if (checkAdmin.rows[0].type_of_user === 1) {
      return NextResponse.json({
        success: false,
        message: "Adminów nie da się usunąć",
      });
    }

    // Only proceed with deletion if user is not an admin
    const result = await db.query(
      "DELETE FROM users WHERE id = $1 RETURNING id",
      [employeeId]
    );

    return NextResponse.json({
      success: true,
      message: "Pracownik został pomyślnie usunięty",
      data: { id: employeeId },
    });
  } catch (error) {
    console.error("Błąd podczas usuwania pracownika:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas usuwania pracownika" },
      { status: 500 }
    );
  }
}
