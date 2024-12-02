import { NextResponse } from "next/server";
import db from "@/lib/db";
import { headers } from "next/headers";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { type NextRequest } from "next/server";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
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

    // Handle password if provided
    if (body.password) {
      const hashedPassword = await bcrypt.hash(body.password, 10);
      queryParts.push(`password = $${paramCounter}`);
      queryParams.push(hashedPassword);
      paramCounter++;
    }

    // Handle working_hours if provided
    if (working_hours !== undefined) {
      queryParts.push(`working_hours = $${paramCounter}`);
      queryParams.push(working_hours);
      paramCounter++;
    }

    // Handle places if provided
    if (places !== undefined) {
      queryParts.push(`places = $${paramCounter}`);
      queryParams.push(places);
      paramCounter++;
    }

    // Handle type_of_user if provided
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

    const query = `
      UPDATE users 
      SET ${queryParts.join(", ")} 
      WHERE id = $${paramCounter} 
      RETURNING *
    `;

    queryParams.push(id);

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
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const query = `
      SELECT id, name, surname, login, COALESCE(working_hours, 0) as working_hours, 
      places, type_of_user, created, logs, phone
      FROM users 
      WHERE id = $1
    `;

    const res = await db.query(query, [id]);

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Nie znaleziono pracownika" },
        { status: 404 }
      );
    }

    const employee = {
      ...res.rows[0],
      phone: res.rows[0].phone ? Number(res.rows[0].phone) : null,
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
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const query = "DELETE FROM users WHERE id = $1 RETURNING *";
    const res = await db.query(query, [id]);

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
