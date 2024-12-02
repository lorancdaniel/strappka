import { NextResponse } from "next/server";
import db from "@/lib/db";
import { headers } from "next/headers";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { params } = context;
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

    // Handle basic fields
    const basicFields = ['name', 'surname', 'login', 'phone'];
    basicFields.forEach(field => {
      if (body[field] !== undefined) {
        queryParts.push(`${field} = $${paramCounter}`);
        queryParams.push(body[field]);
        paramCounter++;
      }
    });

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

    // Handle password updates
    if (body.newPassword) {
      const hashedPassword = await bcrypt.hash(body.newPassword, 10);
      queryParts.push(`password = $${paramCounter}`);
      queryParams.push(hashedPassword);
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
      RETURNING id, name, surname, login, working_hours::float, places, type_of_user, phone
    `;

    const id = parseInt(params.id);
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
      SELECT 
        id, 
        name, 
        surname, 
        login, 
        COALESCE(working_hours, 0)::numeric as working_hours,
        places, 
        type_of_user, 
        created, 
        logs,
        phone
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

    // Zapewniamy, że working_hours jest zawsze numerem
    const employee = {
      ...res.rows[0],
      working_hours: Number(res.rows[0].working_hours) || 0,
    };

    return NextResponse.json({
      success: true,
      data: employee,
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
  context: { params: { id: string } }
) {
  const { params } = await context;

  try {
    const query = "DELETE FROM users WHERE id = $1 RETURNING *";
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
    console.error("Błąd podczas usuwania pracownika:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas usuwania pracownika" },
      { status: 500 }
    );
  }
}
