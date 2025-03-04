import db from "@/lib/db";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { report, fruits } = body;

    if (!report || !fruits || !Array.isArray(fruits)) {
      return NextResponse.json(
        { error: "Nieprawidłowe dane raportu" },
        { status: 400 }
      );
    }

    // Sprawdzenie, czy użytkownik ma dostęp do tego miejsca
    const userPlacesQuery = `
      SELECT 1 FROM user_places 
      WHERE user_id = $1 AND place_id = $2
    `;
    const userPlacesResult = await db.query(userPlacesQuery, [
      payload.id,
      report.place_id,
    ]);

    if (
      (userPlacesResult.rowCount === 0 || userPlacesResult.rowCount === null) &&
      payload.type_of_user !== 1
    ) {
      // Jeśli użytkownik nie jest administratorem i nie ma dostępu do tego miejsca
      return NextResponse.json(
        { error: "Brak dostępu do tego miejsca" },
        { status: 403 }
      );
    }

    // Sprawdzenie, czy raport o danym typie już istnieje
    const checkQuery = `
      SELECT id FROM reports 
      WHERE place_id = $1 
      AND report_date = $2 
      AND report_type = $3
    `;
    const checkResult = await db.query(checkQuery, [
      report.place_id,
      report.report_date,
      report.report_type,
    ]);

    if (checkResult.rowCount && checkResult.rowCount > 0) {
      return NextResponse.json(
        {
          error: `Raport ${
            report.report_type === "start" ? "początkowy" : "końcowy"
          } już istnieje dla tego miejsca i daty`,
        },
        { status: 400 }
      );
    }

    // Rozpoczęcie transakcji
    await db.query("BEGIN");

    // Dodanie raportu
    const insertReportQuery = `
      INSERT INTO reports (
        place_id, 
        user_id, 
        report_date, 
        report_type, 
        terminal_shipment_report, 
        cash_for_change, 
        work_hours, 
        deposited_cash, 
        initial_cash
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING id
    `;
    const reportValues = [
      report.place_id,
      payload.id,
      report.report_date,
      report.report_type,
      report.terminal_shipment_report,
      report.cash_for_change || null,
      report.work_hours,
      report.deposited_cash || null,
      report.initial_cash || null,
    ];

    const reportResult = await db.query(insertReportQuery, reportValues);
    const reportId = reportResult.rows[0].id;

    // Dodanie owoców do raportu
    for (const fruit of fruits) {
      let fruitId = fruit.fruit_id;

      // Jeśli nie ma fruit_id, sprawdź czy owoc istnieje w bazie
      if (!fruitId) {
        const checkFruitQuery = `
          SELECT id FROM fruits WHERE name = $1
        `;
        const fruitResult = await db.query(checkFruitQuery, [fruit.fruit_type]);

        if (fruitResult.rowCount && fruitResult.rowCount > 0) {
          fruitId = fruitResult.rows[0].id;
        } else {
          // Jeśli owoc nie istnieje, dodaj go
          const insertFruitQuery = `
            INSERT INTO fruits (name) VALUES ($1) RETURNING id
          `;
          const newFruitResult = await db.query(insertFruitQuery, [
            fruit.fruit_type,
          ]);
          fruitId = newFruitResult.rows[0].id;
        }
      }

      // Dodanie owocu do raportu
      const insertFruitQuery = `
        INSERT INTO report_fruits (
          report_id, 
          fruit_id, 
          initial_quantity, 
          remaining_quantity, 
          waste_quantity, 
          price_per_kg, 
          gross_sales
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      const fruitValues = [
        reportId,
        fruitId,
        fruit.initial_quantity,
        fruit.remaining_quantity || null,
        fruit.waste_quantity || null,
        fruit.price_per_kg,
        fruit.gross_sales || null,
      ];

      await db.query(insertFruitQuery, fruitValues);

      // Jeśli to raport końcowy, aktualizuj stan magazynowy
      if (report.report_type === "end") {
        const updateInventoryQuery = `
          UPDATE inventory 
          SET quantity = $1, last_updated = NOW() 
          WHERE place_id = $2 AND fruit_id = $3
        `;
        const updateInventoryResult = await db.query(updateInventoryQuery, [
          fruit.remaining_quantity || 0,
          report.place_id,
          fruitId,
        ]);

        // Jeśli nie zaktualizowano żadnego wiersza, dodaj nowy
        if (
          updateInventoryResult.rowCount === 0 ||
          updateInventoryResult.rowCount === null
        ) {
          const insertInventoryQuery = `
            INSERT INTO inventory (place_id, fruit_id, quantity) 
            VALUES ($1, $2, $3)
          `;
          await db.query(insertInventoryQuery, [
            report.place_id,
            fruitId,
            fruit.remaining_quantity || 0,
          ]);
        }
      }
    }

    // Dodanie wpisu do logów
    const logQuery = `
      INSERT INTO user_logs (user_id, action, details) 
      VALUES ($1, $2, $3)
    `;
    await db.query(logQuery, [
      payload.id,
      "report_created",
      JSON.stringify({
        report_id: reportId,
        place_id: report.place_id,
        report_date: report.report_date,
        report_type: report.report_type,
      }),
    ]);

    // Zatwierdzenie transakcji
    await db.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Raport został pomyślnie zapisany",
      reportId,
    });
  } catch (error) {
    // Wycofanie transakcji w przypadku błędu
    await db.query("ROLLBACK");
    console.error("Błąd podczas dodawania raportu:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas zapisywania raportu" },
      { status: 500 }
    );
  }
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
    const reportType = searchParams.get("reportType");

    const queryParams = [];
    const queryConditions = [];
    let queryIndex = 1;

    // Podstawowe zapytanie
    let query = `
      SELECT r.id, r.place_id, r.report_date, r.report_type, 
             r.terminal_shipment_report, r.cash_for_change, r.work_hours, 
             r.deposited_cash, r.initial_cash, r.created_at,
             p.name as place_name,
             u.name || ' ' || u.surname as user_name
      FROM reports r
      JOIN places p ON r.place_id = p.id
      JOIN users u ON r.user_id = u.id
    `;

    // Dodaj warunki wyszukiwania
    if (placeId) {
      queryConditions.push(`r.place_id = $${queryIndex++}`);
      queryParams.push(parseInt(placeId, 10));
    }

    if (date) {
      queryConditions.push(`r.report_date = $${queryIndex++}`);
      queryParams.push(date);
    }

    if (reportType) {
      queryConditions.push(`r.report_type = $${queryIndex++}`);
      queryParams.push(reportType);
    }

    // Dla zwykłych użytkowników, pokaż tylko raporty z miejsc, do których mają dostęp
    if (payload.type_of_user !== 1) {
      queryConditions.push(`
        (r.place_id IN (
          SELECT place_id FROM user_places WHERE user_id = $${queryIndex++}
        ))
      `);
      queryParams.push(payload.id);
    }

    // Dodaj warunki do zapytania
    if (queryConditions.length > 0) {
      query += " WHERE " + queryConditions.join(" AND ");
    }

    // Sortowanie
    query += " ORDER BY r.report_date DESC, r.place_id, r.report_type";

    // Wykonaj zapytanie
    const result = await db.query(query, queryParams);

    // Pobierz dane owoców dla każdego raportu
    const reports = result.rows;
    const reportIds = reports.map((report) => report.id);

    if (reportIds.length > 0) {
      const fruitsQuery = `
        SELECT rf.report_id, rf.fruit_id, f.name as fruit_name, 
               rf.initial_quantity, rf.remaining_quantity, rf.waste_quantity, 
               rf.price_per_kg, rf.gross_sales
        FROM report_fruits rf
        JOIN fruits f ON rf.fruit_id = f.id
        WHERE rf.report_id = ANY($1)
      `;
      const fruitsResult = await db.query(fruitsQuery, [reportIds]);

      // Przypisz owoce do odpowiednich raportów
      const fruitsByReportId = fruitsResult.rows.reduce((acc, fruit) => {
        if (!acc[fruit.report_id]) {
          acc[fruit.report_id] = [];
        }
        acc[fruit.report_id].push(fruit);
        return acc;
      }, {});

      reports.forEach((report) => {
        report.fruits = fruitsByReportId[report.id] || [];
      });
    }

    return NextResponse.json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error("Błąd podczas pobierania raportów:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania raportów" },
      { status: 500 }
    );
  }
}
