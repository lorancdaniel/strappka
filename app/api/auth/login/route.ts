import { NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcrypt";
import {
  generateToken,
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_MAX_AGE,
} from "@/lib/auth";

async function getUserByEmail(email: string) {
  console.log(`Szukam użytkownika o adresie email: ${email}`);
  const res = await db.query(
    "SELECT id, email, password, name, surname, type_of_user FROM users WHERE email = $1",
    [email]
  );
  console.log(`Znaleziono użytkownika: ${res.rows.length > 0}`);
  return res.rows[0];
}

async function verifyPassword(password: string, hashedPassword: string) {
  console.log("Weryfikuję hasło...");
  const isValid = await bcrypt.compare(password, hashedPassword);
  console.log(`Hasło jest poprawne: ${isValid}`);
  return isValid;
}

export async function POST(request: Request) {
  try {
    console.log("=== ROZPOCZĘCIE PROCESU LOGOWANIA ===");
    const { email, password } = await request.json();
    console.log(
      `Otrzymano dane logowania. Email: ${email}, Hasło: ${
        password ? "[UKRYTE]" : "brak"
      }`
    );

    if (!email || !password) {
      console.log("Brak wymaganych danych logowania");
      return NextResponse.json(
        { error: "Email i hasło są wymagane" },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email);
    if (!user) {
      console.log("Nie znaleziono użytkownika o podanym adresie email");
      return NextResponse.json(
        { error: "Nieprawidłowy email lub hasło" },
        { status: 401 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      console.log("Nieprawidłowe hasło");
      return NextResponse.json(
        { error: "Nieprawidłowy email lub hasło" },
        { status: 401 }
      );
    }

    console.log("Generuję token JWT...");
    const token = await generateToken(user);
    console.log("Token wygenerowany pomyślnie");

    console.log("Tworzę odpowiedź z danymi użytkownika");
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: `${user.name} ${user.surname}`,
        role: user.type_of_user === 1 ? "admin" : "user",
      },
    });

    console.log("Ustawiam ciasteczko z tokenem");
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: AUTH_COOKIE_MAX_AGE,
    });

    console.log("=== ZAKOŃCZENIE PROCESU LOGOWANIA ===");
    return response;
  } catch (error) {
    console.error("Błąd logowania:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd serwera" },
      { status: 500 }
    );
  }
}
