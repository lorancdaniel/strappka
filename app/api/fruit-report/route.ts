import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { report_id, fruits } = body;

    if (!Array.isArray(fruits) || fruits.length === 0) {
      return new NextResponse("Brak owoców do dodania", { status: 400 });
    }

    // Rozpocznij transakcję
    await db.query('BEGIN');

    try {
      // Dodaj każdy owoc do raportu
      for (const fruit of fruits) {
        const {
          fruit_type,
          initial_quantity,
          remaining_quantity,
          waste_quantity,
          price_per_kg,
          gross_sales,
        } = fruit;

        // Sprawdzenie walidacji ilości
        if (remaining_quantity + waste_quantity > initial_quantity) {
          throw new Error(
            `Suma ilości pozostałej i odpadów nie może przekraczać ilości początkowej dla ${fruit_type}`
          );
        }

        await db.query(
          `INSERT INTO report_fruits 
          (report_id, fruit_type, initial_quantity, remaining_quantity, waste_quantity, price_per_kg, gross_sales)
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            report_id,
            fruit_type,
            initial_quantity,
            remaining_quantity,
            waste_quantity,
            price_per_kg,
            gross_sales,
          ]
        );
      }

      // Zatwierdź transakcję
      await db.query('COMMIT');

      return NextResponse.json({ success: true });
    } catch (error) {
      // Wycofaj transakcję w przypadku błędu
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error("Błąd podczas dodawania raportu owoców:", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Internal Server Error",
      { status: 500 }
    );
  }
}
