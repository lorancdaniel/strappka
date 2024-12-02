import { NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcrypt";
import { generateToken, AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE } from "@/lib/auth";

async function getUserByLogin(login: string) {
  const res = await db.query(
    "SELECT id, login, password, name, type_of_user FROM users WHERE login = $1",
    [login]
  );
  return res.rows[0];
}

async function verifyPassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}

export async function POST(request: Request) {
  try {
    const { login, password } = await request.json();

    if (!login || !password) {
      return NextResponse.json(
        { error: "Login i hasło są wymagane" },
        { status: 400 }
      );
    }

    const user = await getUserByLogin(login);
    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json(
        { error: "Nieprawidłowy login lub hasło" },
        { status: 401 }
      );
    }

    const token = await generateToken(user);
    
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.type_of_user === 1 ? "admin" : "user",
      },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: AUTH_COOKIE_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error("Błąd logowania:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd serwera" },
      { status: 500 }
    );
  }
}
