import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST() {
  try {
    await db.query("UPDATE users SET working_hours = 0");

    return NextResponse.json({
      success: true,
      message: "Pomyślnie zresetowano godziny",
    });
  } catch (error) {
    console.error("Błąd podczas resetowania godzin:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas resetowania godzin" },
      { status: 500 }
    );
  }
}
