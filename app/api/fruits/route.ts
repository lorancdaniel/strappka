import db from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("[FRUITS_API] Pobieranie listy wszystkich owoców");

    const result = await db.query(`
      SELECT id, name
      FROM fruits
      ORDER BY name
    `);

    console.log("[FRUITS_API] Znaleziono owoców:", result.rowCount);

    return NextResponse.json({
      success: true,
      fruits: result.rows,
    });
  } catch (error) {
    console.error("[FRUITS_API] Błąd podczas pobierania listy owoców:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania listy owoców" },
      { status: 500 }
    );
  }
}
