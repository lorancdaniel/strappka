import db from "@/lib/db";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

interface Report {
  id: number;
  place_id: number;
  report_date: string;
  report_type: "start" | "end";
}

export async function GET(request: NextRequest) {
  try {
    // Weryfikacja tokena
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      return NextResponse.json(
        { error: "Nieprawidłowy token" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get("placeId");
    const date = searchParams.get("date");

    console.log("[REPORTS_CHECK] Parametry zapytania:", { placeId, date });

    if (!placeId || !date) {
      console.log("[REPORTS_CHECK] Brak wymaganych parametrów");
      return NextResponse.json(
        { error: "Brak wymaganych parametrów" },
        { status: 400 }
      );
    }

    // Konwersja placeId na liczbę
    const placeIdNumber = parseInt(placeId, 10);

    // Proste zapytanie sprawdzające istnienie raportów
    const checkQuery = `
      SELECT 
        EXISTS (
          SELECT 1 FROM reports 
          WHERE place_id = $1 
          AND report_date = $2 
          AND report_type = 'start'
        ) as has_start_report,
        EXISTS (
          SELECT 1 FROM reports 
          WHERE place_id = $1 
          AND report_date = $2 
          AND report_type = 'end'
        ) as has_end_report
    `;

    console.log("[REPORTS_CHECK] Wykonywanie zapytania sprawdzającego:", [
      placeIdNumber,
      date,
    ]);
    const checkResult = await db.query(checkQuery, [placeIdNumber, date]);

    // Pobierz wszystkie raporty dla danego miejsca i daty
    const reportsQuery = `
      SELECT id, place_id, report_date, report_type
      FROM reports 
      WHERE place_id = $1 
      AND report_date = $2
    `;

    console.log("[REPORTS_CHECK] Pobieranie raportów:", [placeIdNumber, date]);
    const reportsResult = await db.query(reportsQuery, [placeIdNumber, date]);

    const hasStartReport = checkResult.rows[0].has_start_report;
    const hasEndReport = checkResult.rows[0].has_end_report;
    const reports = reportsResult.rows as Report[];

    console.log("[REPORTS_CHECK] Wyniki:", {
      hasStartReport,
      hasEndReport,
      reportCount: reports.length,
      reports,
    });

    return NextResponse.json({
      hasStartReport,
      hasEndReport,
      hasAllReports: hasStartReport && hasEndReport,
      reportCount: reports.length,
      reports,
    });
  } catch (error) {
    console.error("[REPORTS_CHECK] Błąd:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas sprawdzania raportów" },
      { status: 500 }
    );
  }
}
