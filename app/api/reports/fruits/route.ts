import db from "@/lib/db";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    console.log("[REPORT_FRUITS] Rozpoczynam pobieranie owoców dla raportu");

    // Weryfikacja tokena
    const token = request.cookies.get("token")?.value;
    if (!token) {
      console.log("[REPORT_FRUITS] Brak tokena autoryzacji");
      return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      console.log("[REPORT_FRUITS] Nieprawidłowy token");
      return NextResponse.json(
        { error: "Nieprawidłowy token" },
        { status: 401 }
      );
    }

    // Pobranie parametrów z URL
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("reportId");

    console.log("[REPORT_FRUITS] Parametry zapytania:", { reportId });

    if (!reportId) {
      console.log("[REPORT_FRUITS] Brak ID raportu");
      return NextResponse.json({ error: "Brak ID raportu" }, { status: 400 });
    }

    // Konwersja reportId na liczbę
    const reportIdNumber = parseInt(reportId, 10);
    if (isNaN(reportIdNumber)) {
      console.log("[REPORT_FRUITS] Nieprawidłowy format ID raportu:", reportId);
      return NextResponse.json(
        { error: "Nieprawidłowy format ID raportu" },
        { status: 400 }
      );
    }

    // Sprawdzenie, czy raport istnieje
    const checkReportQuery = `
      SELECT r.id, r.place_id, r.report_type
      FROM reports r
      WHERE r.id = $1
    `;
    const checkReportResult = await db.query(checkReportQuery, [
      reportIdNumber,
    ]);

    if (checkReportResult.rowCount === 0) {
      console.log("[REPORT_FRUITS] Raport nie istnieje");
      return NextResponse.json(
        { error: "Raport nie istnieje" },
        { status: 404 }
      );
    }

    const report = checkReportResult.rows[0];
    console.log("[REPORT_FRUITS] Znaleziono raport:", report);

    // Sprawdzenie uprawnień do raportu (tylko dla zwykłych użytkowników)
    if (payload.role !== "admin") {
      console.log(
        "[REPORT_FRUITS] Sprawdzanie uprawnień dla użytkownika:",
        payload.id
      );

      // Sprawdzenie, czy użytkownik ma dostęp do miejsca
      const userPlacesQuery = `
        SELECT 1 FROM user_places 
        WHERE user_id = $1 AND place_id = $2
      `;
      const userPlacesResult = await db.query(userPlacesQuery, [
        payload.id,
        report.place_id,
      ]);

      if (userPlacesResult.rowCount === 0) {
        console.log("[REPORT_FRUITS] Użytkownik nie ma dostępu do miejsca");
        return NextResponse.json(
          { error: "Brak dostępu do tego raportu" },
          { status: 403 }
        );
      }
    }

    // Pobranie owoców dla raportu - zaktualizowane zapytanie
    const fruitsQuery = `
      SELECT rf.id, rf.report_id, rf.fruit_id, f.name as fruit_name, 
             rf.initial_quantity, rf.remaining_quantity, rf.waste_quantity, 
             rf.price_per_kg, rf.gross_sales
      FROM report_fruits rf
      JOIN fruits f ON rf.fruit_id = f.id
      WHERE rf.report_id = $1
      ORDER BY rf.id
    `;

    try {
      const fruitsResult = await db.query(fruitsQuery, [reportIdNumber]);
      console.log("[REPORT_FRUITS] Znaleziono owoców:", fruitsResult.rowCount);
      console.log(
        "[REPORT_FRUITS] Przykładowe dane:",
        fruitsResult.rows.length > 0
          ? JSON.stringify(fruitsResult.rows[0])
          : "brak danych"
      );

      return NextResponse.json(fruitsResult.rows);
    } catch (dbError: unknown) {
      console.error("[REPORT_FRUITS] Błąd SQL:", dbError);
      return NextResponse.json(
        {
          error: "Wystąpił błąd podczas pobierania danych",
          details:
            dbError instanceof Error ? dbError.message : "Nieznany błąd SQL",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(
      "[REPORT_FRUITS] Błąd podczas pobierania owoców dla raportu:",
      error
    );
    return NextResponse.json(
      {
        error: "Wystąpił błąd podczas pobierania danych",
        details: error instanceof Error ? error.message : "Nieznany błąd",
      },
      { status: 500 }
    );
  }
}
