import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import db from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // Weryfikacja tokenu
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Brak autoryzacji" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      return NextResponse.json(
        { error: "Nieprawidłowy token" },
        { status: 401 }
      );
    }

    // Pobranie danych z formularza
    const { report, fruits } = await request.json();
    
    // Rozpoczęcie transakcji
    await db.query('BEGIN');

    try {
      // Dodanie raportu głównego
      const reportQuery = `
        INSERT INTO reports (
          place_id, 
          report_date, 
          report_type, 
          terminal_shipment_report, 
          cash_for_change, 
          work_hours, 
          deposited_cash, 
          initial_cash,
          created_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING id
      `;

      const reportResult = await db.query(reportQuery, [
        report.place_id,
        report.report_date,
        report.report_type,
        report.terminal_shipment_report,
        report.cash_for_change,
        report.work_hours,
        report.deposited_cash,
        report.initial_cash
      ]);

      const reportId = reportResult.rows[0].id;

      // Dodanie danych o owocach
      for (const fruit of fruits) {
        const fruitQuery = `
          INSERT INTO report_fruits (
            report_id,
            fruit_type,
            initial_quantity,
            remaining_quantity,
            waste_quantity,
            price_per_kg,
            gross_sales
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

        await db.query(fruitQuery, [
          reportId,
          fruit.fruit_type,
          fruit.initial_quantity,
          fruit.remaining_quantity,
          fruit.waste_quantity,
          fruit.price_per_kg,
          fruit.gross_sales
        ]);
      }

      // Zatwierdzenie transakcji
      await db.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: "Raport został pomyślnie zapisany",
        reportId
      });

    } catch (error) {
      // Wycofanie transakcji w przypadku błędu
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error("Błąd podczas zapisywania raportu:", error);
    return NextResponse.json(
      { 
        error: "Wystąpił błąd podczas zapisywania raportu",
        details: error instanceof Error ? error.message : "Nieznany błąd"
      },
      { status: 500 }
    );
  }
}
