import { NextResponse } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = "TwojSekretnyKlucz"; // Upewnij się, że przechowujesz ten klucz w zmiennych środowiskowych

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email i hasło są wymagane" },
      { status: 400 }
    );
  }

  try {
    const res = await pool.query("SELECT * FROM users WHERE login = $1", [
      email,
    ]);

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Nieprawidłowy email lub hasło" },
        { status: 401 }
      );
    }

    const user = res.rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Nieprawidłowy email lub hasło" },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        role: user.type_of_user === 1 ? "admin" : "user",
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Ustaw token w ciasteczku HTTP-only
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.type_of_user === 1 ? "admin" : "user",
      },
    });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Wystąpił błąd serwera" },
      { status: 500 }
    );
  }
}
