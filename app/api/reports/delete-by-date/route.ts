import db from "@/lib/db";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function DELETE(request: NextRequest) {
  try {
    console.log("[DELETE_REPORTS] Rozpoczynam usuwanie raportów");

    // Weryfikacja tokena
    const token = request.cookies.get("token")?.value;
    if (!token) {
      console.log("[DELETE_REPORTS] Brak tokena autoryzacji");
      return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      console.log("[DELETE_REPORTS] Nieprawidłowy token");
      return NextResponse.json(
        { error: "Nieprawidłowy token" },
        { status: 401 }
      );
    }

    // Upewniamy się, że payload.id jest liczbą
    const userId = Number(payload.id);
    if (isNaN(userId)) {
      console.log("[DELETE_REPORTS] Nieprawidłowy identyfikator użytkownika");
      return NextResponse.json(
        { error: "Nieprawidłowy identyfikator użytkownika" },
        { status: 401 }
      );
    }

    // Sprawdzamy, czy użytkownik jest administratorem na podstawie roli
    const isAdmin = payload.role === "admin";

    console.log("[DELETE_REPORTS] Użytkownik:", {
      id: userId,
      role: payload.role,
      isAdmin: isAdmin,
    });

    // Pobranie parametrów z URL
    const url = new URL(request.url);
    const placeId = url.searchParams.get("placeId");
    const date = url.searchParams.get("date");
    const reportType = url.searchParams.get("reportType"); // opcjonalny parametr, jeśli chcemy usunąć tylko określony typ raportu

    console.log("[DELETE_REPORTS] Parametry zapytania:", {
      placeId,
      date,
      reportType,
    });

    if (!placeId || !date) {
      console.log("[DELETE_REPORTS] Brak wymaganych parametrów");
      return NextResponse.json(
        { error: "Brak wymaganych parametrów (placeId, date)" },
        { status: 400 }
      );
    }

    // Konwersja placeId na liczbę
    const placeIdNumber = parseInt(placeId, 10);
    if (isNaN(placeIdNumber)) {
      console.log("[DELETE_REPORTS] Nieprawidłowy format placeId:", placeId);
      return NextResponse.json(
        { error: "Nieprawidłowy format identyfikatora miejsca" },
        { status: 400 }
      );
    }

    // Sprawdzenie uprawnień do usuwania raportów
    let hasPermission = false;

    // 1. Jeśli użytkownik jest administratorem, ma uprawnienia
    if (isAdmin) {
      console.log(
        "[DELETE_REPORTS] Użytkownik jest administratorem, ma uprawnienia"
      );
      hasPermission = true;
    }
    // 2. Sprawdzenie, czy użytkownik ma dostęp do tego miejsca
    else {
      console.log(
        "[DELETE_REPORTS] Sprawdzam dostęp użytkownika do miejsca:",
        placeIdNumber
      );

      const userPlacesQuery = `
        SELECT 1 FROM user_places 
        WHERE user_id = $1 AND place_id = $2
      `;
      const userPlacesResult = await db.query(userPlacesQuery, [
        userId,
        placeIdNumber,
      ]);

      const hasAccessToPlace =
        userPlacesResult.rowCount && userPlacesResult.rowCount > 0;
      console.log("[DELETE_REPORTS] Wynik sprawdzania dostępu do miejsca:", {
        rowCount: userPlacesResult.rowCount,
        hasAccess: hasAccessToPlace,
      });

      // Jeśli użytkownik ma dostęp do miejsca, ma uprawnienia
      if (hasAccessToPlace) {
        console.log(
          "[DELETE_REPORTS] Użytkownik ma dostęp do miejsca, ma uprawnienia"
        );
        hasPermission = true;
      }
      // 3. Jeśli użytkownik nie ma dostępu do miejsca, sprawdzamy, czy jest właścicielem raportów
      else {
        console.log(
          "[DELETE_REPORTS] Użytkownik nie ma dostępu do miejsca, sprawdzam czy jest właścicielem raportów"
        );

        // Znajdź raporty dla podanego miejsca i daty, gdzie użytkownik jest właścicielem
        let userReportsQuery = `
          SELECT id FROM reports
          WHERE place_id = $1 AND report_date = $2 AND user_id = $3
        `;
        const userReportsParams: (string | number)[] = [
          placeIdNumber,
          date,
          userId,
        ];

        // Jeśli podano typ raportu, dodaj go do zapytania
        if (reportType) {
          userReportsQuery += ` AND report_type = $4`;
          userReportsParams.push(reportType);
        }

        console.log(
          "[DELETE_REPORTS] Sprawdzam, czy użytkownik jest właścicielem raportów"
        );

        const userReportsResult = await db.query(
          userReportsQuery,
          userReportsParams
        );

        const isReportOwner =
          userReportsResult.rowCount && userReportsResult.rowCount > 0;
        console.log(
          "[DELETE_REPORTS] Wynik sprawdzania właściciela raportów:",
          {
            rowCount: userReportsResult.rowCount,
            isOwner: isReportOwner,
          }
        );

        // Jeśli użytkownik jest właścicielem raportów, ma uprawnienia
        if (isReportOwner) {
          console.log(
            "[DELETE_REPORTS] Użytkownik jest właścicielem raportów, ma uprawnienia"
          );
          hasPermission = true;
        }
      }
    }

    // Jeśli użytkownik nie ma uprawnień, zwróć błąd
    if (!hasPermission) {
      console.log(
        "[DELETE_REPORTS] Użytkownik nie ma uprawnień do usuwania raportów"
      );
      return NextResponse.json(
        { error: "Brak dostępu do tego miejsca" },
        { status: 403 }
      );
    }

    // Rozpoczęcie transakcji
    await db.query("BEGIN");

    try {
      // Znajdź ID raportów do usunięcia
      let findReportsQuery = `
        SELECT id FROM reports
        WHERE place_id = $1 AND report_date = $2
      `;
      const queryParams: (string | number)[] = [placeIdNumber, date];

      // Jeśli podano typ raportu, dodaj go do zapytania
      if (reportType) {
        findReportsQuery += ` AND report_type = $3`;
        queryParams.push(reportType);
      }

      // Jeśli użytkownik nie jest administratorem, dodaj warunek, że może usuwać tylko swoje raporty
      if (!isAdmin) {
        const userIdParamIndex = queryParams.length + 1;
        findReportsQuery += ` AND user_id = $${userIdParamIndex}`;
        queryParams.push(userId);
      }

      console.log("[DELETE_REPORTS] Zapytanie o raporty do usunięcia:", {
        query: findReportsQuery,
        params: queryParams,
      });

      const reportsResult = await db.query(findReportsQuery, queryParams);
      console.log(
        "[DELETE_REPORTS] Znaleziono raportów do usunięcia:",
        reportsResult.rowCount
      );

      if (!reportsResult.rowCount || reportsResult.rowCount === 0) {
        await db.query("ROLLBACK");
        console.log("[DELETE_REPORTS] Nie znaleziono raportów do usunięcia");
        return NextResponse.json(
          { error: "Nie znaleziono raportów dla podanych parametrów" },
          { status: 404 }
        );
      }

      const reportIds = reportsResult.rows.map((row) => row.id);
      console.log("[DELETE_REPORTS] ID raportów do usunięcia:", reportIds);

      // Usuń powiązane rekordy z tabeli report_fruits
      const deleteFruitsQuery = `
        DELETE FROM report_fruits
        WHERE report_id = ANY($1)
      `;
      const deleteFruitsResult = await db.query(deleteFruitsQuery, [reportIds]);
      console.log(
        "[DELETE_REPORTS] Usunięto powiązanych owoców:",
        deleteFruitsResult.rowCount
      );

      // Usuń raporty
      const deleteReportsQuery = `
        DELETE FROM reports
        WHERE id = ANY($1)
        RETURNING id
      `;
      const deleteResult = await db.query(deleteReportsQuery, [reportIds]);
      console.log("[DELETE_REPORTS] Usunięto raportów:", deleteResult.rowCount);

      // Zatwierdzenie transakcji
      await db.query("COMMIT");
      console.log("[DELETE_REPORTS] Transakcja zatwierdzona");

      return NextResponse.json({
        success: true,
        message: `Usunięto ${deleteResult.rowCount} raportów`,
        deletedIds: deleteResult.rows.map((row) => row.id),
      });
    } catch (error) {
      // W przypadku błędu, wycofujemy transakcję
      await db.query("ROLLBACK");
      console.error("[DELETE_REPORTS] Błąd podczas transakcji:", error);
      throw error;
    }
  } catch (error) {
    console.error("[DELETE_REPORTS] Błąd podczas usuwania raportów:", error);
    return NextResponse.json(
      {
        error: "Wystąpił błąd podczas usuwania raportów",
        details: error instanceof Error ? error.message : "Nieznany błąd",
      },
      { status: 500 }
    );
  }
}
