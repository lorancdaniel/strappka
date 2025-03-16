import db from "@/lib/db";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function DELETE(request: NextRequest) {
  try {
    console.log("[ADMIN_DELETE_REPORT] Rozpoczynam usuwanie raportu");

    // Weryfikacja tokena
    const token = request.cookies.get("token")?.value;
    if (!token) {
      console.log("[ADMIN_DELETE_REPORT] Brak tokena autoryzacji");
      return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      console.log("[ADMIN_DELETE_REPORT] Nieprawidłowy token");
      return NextResponse.json(
        { error: "Nieprawidłowy token" },
        { status: 401 }
      );
    }

    // Sprawdzenie, czy użytkownik jest administratorem
    if (payload.role !== "admin") {
      console.log("[ADMIN_DELETE_REPORT] Użytkownik nie jest administratorem");
      return NextResponse.json(
        { error: "Brak uprawnień administratora" },
        { status: 403 }
      );
    }

    // Pobranie ID raportu z URL
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("id");

    console.log("[ADMIN_DELETE_REPORT] ID raportu do usunięcia:", reportId);

    if (!reportId) {
      console.log("[ADMIN_DELETE_REPORT] Brak ID raportu");
      return NextResponse.json({ error: "Brak ID raportu" }, { status: 400 });
    }

    // Konwersja reportId na liczbę
    const reportIdNumber = parseInt(reportId, 10);
    if (isNaN(reportIdNumber)) {
      console.log(
        "[ADMIN_DELETE_REPORT] Nieprawidłowy format ID raportu:",
        reportId
      );
      return NextResponse.json(
        { error: "Nieprawidłowy format ID raportu" },
        { status: 400 }
      );
    }

    // Rozpoczęcie transakcji
    await db.query("BEGIN");

    try {
      // Sprawdzenie, czy raport istnieje
      const checkReportQuery = `
        SELECT id, place_id, report_date, report_type FROM reports
        WHERE id = $1
      `;
      const checkReportResult = await db.query(checkReportQuery, [
        reportIdNumber,
      ]);

      if (checkReportResult.rowCount === 0) {
        await db.query("ROLLBACK");
        console.log("[ADMIN_DELETE_REPORT] Raport nie istnieje");
        return NextResponse.json(
          { error: "Raport nie istnieje" },
          { status: 404 }
        );
      }

      const report = checkReportResult.rows[0];
      console.log("[ADMIN_DELETE_REPORT] Znaleziono raport:", report);

      // Usuń powiązane rekordy z tabeli report_fruits
      const deleteFruitsQuery = `
        DELETE FROM report_fruits
        WHERE report_id = $1
        RETURNING id
      `;
      const deleteFruitsResult = await db.query(deleteFruitsQuery, [
        reportIdNumber,
      ]);
      console.log(
        "[ADMIN_DELETE_REPORT] Usunięto powiązanych owoców:",
        deleteFruitsResult.rowCount
      );

      // Usuń raport
      const deleteReportQuery = `
        DELETE FROM reports
        WHERE id = $1
        RETURNING id
      `;
      const deleteReportResult = await db.query(deleteReportQuery, [
        reportIdNumber,
      ]);
      console.log(
        "[ADMIN_DELETE_REPORT] Usunięto raport:",
        deleteReportResult.rowCount
      );

      // Zatwierdzenie transakcji
      await db.query("COMMIT");
      console.log("[ADMIN_DELETE_REPORT] Transakcja zatwierdzona");

      return NextResponse.json({
        success: true,
        message: "Raport został pomyślnie usunięty",
        deletedReport: {
          id: reportIdNumber,
          place_id: report.place_id,
          report_date: report.report_date,
          report_type: report.report_type,
        },
      });
    } catch (error) {
      // Wycofanie transakcji w przypadku błędu
      await db.query("ROLLBACK");
      console.error(
        "[ADMIN_DELETE_REPORT] Błąd podczas usuwania raportu:",
        error
      );
      throw error;
    }
  } catch (error) {
    console.error("[ADMIN_DELETE_REPORT] Błąd:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas usuwania raportu" },
      { status: 500 }
    );
  }
}
