import { NextResponse } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcrypt";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "name";
    const order = searchParams.get("order") || "asc";

    // Dodajemy logi do debugowania
    console.log("=== POBIERANIE PRACOWNIKÓW ===");
    console.log("Parametry wyszukiwania:", { search, sortBy, order });

    // Zabezpieczamy sortowanie przed SQL injection
    const allowedSortFields = ["name", "surname", "login", "type_of_user"];
    const allowedOrders = ["asc", "desc"];

    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : "name";
    const validOrder = allowedOrders.includes(order.toLowerCase())
      ? order
      : "asc";

    const query = `
      SELECT 
        id, 
        name, 
        surname, 
        login, 
        type_of_user
      FROM users
      WHERE 
        LOWER(name) LIKE LOWER($1) 
        OR LOWER(surname) LIKE LOWER($1)
        OR LOWER(login) LIKE LOWER($1)
      ORDER BY ${validSortBy} ${validOrder}
    `;

    console.log("Zapytanie SQL:", query);

    const res = await pool.query(query, [`%${search}%`]);

    console.log("Znaleziono rekordów:", res.rows.length);

    return NextResponse.json({
      success: true,
      data: res.rows,
    });
  } catch (error) {
    console.error("Błąd podczas pobierania pracowników:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Wystąpił błąd podczas pobierania pracowników",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const {
      name,
      surname,
      login,
      password,
      working_hours,
      places,
      type_of_user,
    } = await request.json();

    // Walidacja
    if (!name || !surname || !login || !password) {
      return NextResponse.json(
        { error: "Wymagane pola nie zostały wypełnione" },
        { status: 400 }
      );
    }

    // Hashowanie hasła
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (
        name, 
        surname, 
        login, 
        password, 
        working_hours, 
        places, 
        type_of_user
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, surname, login, working_hours, places, type_of_user
    `;

    const res = await pool.query(query, [
      name,
      surname,
      login,
      hashedPassword,
      working_hours || 0,
      places || [],
      type_of_user || 0,
    ]);

    return NextResponse.json({
      success: true,
      data: res.rows[0],
    });
  } catch (error: any) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Podany login już istnieje" },
        { status: 409 }
      );
    }

    console.error("Błąd podczas dodawania pracownika:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas dodawania pracownika" },
      { status: 500 }
    );
  }
}
