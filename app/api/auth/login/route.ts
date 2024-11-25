import { NextResponse } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcrypt";
import * as jose from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "twoj_tajny_klucz_jwt"
);

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
    return createAuthResponse(user, token);
  } catch (error) {
    console.error("Błąd logowania:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd serwera" },
      { status: 500 }
    );
  }
}

async function getUserByLogin(login: string) {
  const res = await pool.query(
    "SELECT id, login, password, name, type_of_user FROM users WHERE login = $1",
    [login]
  );
  return res.rows[0];
}

async function verifyPassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}

async function generateToken(user: any) {
  return await new jose.SignJWT({
    id: user.id,
    name: user.name,
    role: user.type_of_user === 1 ? "admin" : "user",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(JWT_SECRET);
}

function createAuthResponse(user: any, token: string) {
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
    sameSite: "lax",
    maxAge: 3600,
  });

  return response;
}
