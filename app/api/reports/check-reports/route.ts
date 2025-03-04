import db from "@/lib/db";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

interface Report {
  id: number;
  place_id: number;
  report_date: string;
  report_type: "start" | "end";
  user_name: string;
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

    // Sprawdzenie, czy użytkownik ma dostęp do tego miejsca
    const userPlacesQuery = `
      SELECT 1 FROM user_places 
      WHERE user_id = $1 AND place_id = $2
    `;
    const userPlacesResult = await db.query(userPlacesQuery, [
      payload.id,
      placeIdNumber,
    ]);

    if (userPlacesResult.rowCount === 0 && payload.type_of_user !== 1) {
      // Jeśli użytkownik nie jest administratorem i nie ma dostępu do tego miejsca
      return NextResponse.json(
        { error: "Brak dostępu do tego miejsca" },
        { status: 403 }
      );
    }

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
      SELECT r.id, r.place_id, r.report_date, r.report_type, u.name || ' ' || u.surname AS user_name
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE r.place_id = $1 
      AND r.report_date = $2
    `;

    console.log("[REPORTS_CHECK] Pobieranie raportów:", [placeIdNumber, date]);
    const reportsResult = await db.query(reportsQuery, [placeIdNumber, date]);

    // Pobierz stan magazynowy dla tego miejsca
    const inventoryQuery = `
      SELECT i.fruit_id, i.quantity, f.name AS fruit_name
      FROM inventory i
      JOIN fruits f ON i.fruit_id = f.id
      WHERE i.place_id = $1
      ORDER BY f.name
    `;

    const inventoryResult = await db.query(inventoryQuery, [placeIdNumber]);

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
      inventory: inventoryResult.rows,
    });
  } catch (error) {
    console.error("[REPORTS_CHECK] Błąd:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas sprawdzania raportów" },
      { status: 500 }
    );
  }
}
