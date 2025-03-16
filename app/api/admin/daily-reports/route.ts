import db from "@/lib/db";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    console.log(
      "[ADMIN_DAILY_REPORTS] Rozpoczynam pobieranie raportów dziennych"
    );

    // Weryfikacja tokena
    const token = request.cookies.get("token")?.value;
    if (!token) {
      console.log("[ADMIN_DAILY_REPORTS] Brak tokena autoryzacji");
      return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      console.log("[ADMIN_DAILY_REPORTS] Nieprawidłowy token");
      return NextResponse.json(
        { error: "Nieprawidłowy token" },
        { status: 401 }
      );
    }

    // Sprawdzenie, czy użytkownik jest administratorem
    if (payload.role !== "admin") {
      console.log("[ADMIN_DAILY_REPORTS] Użytkownik nie jest administratorem");
      return NextResponse.json(
        { error: "Brak uprawnień administratora" },
        { status: 403 }
      );
    }

    // Pobranie parametrów z URL
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const placeId = searchParams.get("placeId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sortField = searchParams.get("sortField") || "report_date";
    const sortDirection = searchParams.get("sortDirection") || "desc";

    console.log("[ADMIN_DAILY_REPORTS] Parametry zapytania:", {
      page,
      pageSize,
      placeId,
      startDate,
      endDate,
      sortField,
      sortDirection,
    });

    // Walidacja parametrów
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      console.log("[ADMIN_DAILY_REPORTS] Nieprawidłowe parametry paginacji");
      return NextResponse.json(
        { error: "Nieprawidłowe parametry paginacji" },
        { status: 400 }
      );
    }

    // Przygotowanie zapytania
    const queryParams: (string | number)[] = [];
    const queryConditions: string[] = [];
    let paramIndex = 1;

    // Podstawowe zapytanie
    let query = `
      SELECT 
        dr.id, 
        dr.place_id, 
        dr.report_date, 
        dr.created_at,
        dr.summary_data,
        p.name as place_name
      FROM daily_reports dr
      JOIN places p ON dr.place_id = p.id
    `;

    // Dodawanie warunków filtrowania
    if (placeId && placeId !== "all") {
      queryConditions.push(`dr.place_id = $${paramIndex++}`);
      queryParams.push(parseInt(placeId, 10));
    }

    if (startDate) {
      queryConditions.push(`dr.report_date >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      queryConditions.push(`dr.report_date <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    // Dodanie warunków do zapytania
    if (queryConditions.length > 0) {
      query += ` WHERE ${queryConditions.join(" AND ")}`;
    }

    // Zapytanie o całkowitą liczbę rekordów
    const countQuery = `
      SELECT COUNT(*) as total
      FROM daily_reports dr
      JOIN places p ON dr.place_id = p.id
      ${
        queryConditions.length > 0
          ? `WHERE ${queryConditions.join(" AND ")}`
          : ""
      }
    `;

    console.log("[ADMIN_DAILY_REPORTS] Zapytanie o liczbę rekordów:", {
      query: countQuery,
      params: queryParams,
    });

    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Dodanie sortowania i paginacji
    query += ` ORDER BY ${sortField} ${
      sortDirection === "asc" ? "ASC" : "DESC"
    }`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(pageSize);
    queryParams.push((page - 1) * pageSize);

    console.log("[ADMIN_DAILY_REPORTS] Zapytanie o raporty dzienne:", {
      query,
      params: queryParams,
    });

    // Wykonanie zapytania
    const result = await db.query(query, queryParams);

    // Przetwarzanie wyników
    const reports = result.rows.map((row) => {
      // Jeśli summary_data jest tablicą, weź pierwszy element
      const summaryData =
        Array.isArray(row.summary_data) && row.summary_data.length > 0
          ? row.summary_data[0]
          : row.summary_data;

      // Przygotowanie danych raportu
      return {
        id: row.id,
        place_id: row.place_id,
        place_name: row.place_name,
        report_date: row.report_date,
        created_at: row.created_at,
        // Dodanie danych z summary_data
        has_start_report: summaryData?.has_start_report || false,
        has_end_report: summaryData?.has_end_report || false,
        start_report_id: summaryData?.start_report_id || null,
        end_report_id: summaryData?.end_report_id || null,
        start_user_name: summaryData?.start_user_name || "",
        end_user_name: summaryData?.end_user_name || "",
        start_work_hours: summaryData?.start_work_hours || 0,
        end_work_hours: summaryData?.end_work_hours || 0,
        initial_cash: summaryData?.initial_cash || 0,
        deposited_cash: summaryData?.deposited_cash || 0,
        start_terminal_report: summaryData?.start_terminal_report || "",
        end_terminal_report: summaryData?.end_terminal_report || "",
        total_initial_quantity: summaryData?.total_initial_quantity || 0,
        total_remaining_quantity: summaryData?.total_remaining_quantity || 0,
        total_waste_quantity: summaryData?.total_waste_quantity || 0,
        total_sold_quantity: summaryData?.total_sold_quantity || 0,
        total_gross_sales: summaryData?.total_gross_sales || 0,
        total_calculated_sales: summaryData?.total_calculated_sales || 0,
      };
    });

    // Przygotowanie odpowiedzi
    const response = {
      reports,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    console.log(
      `[ADMIN_DAILY_REPORTS] Pobrano ${
        reports.length
      } raportów dziennych (strona ${page}/${Math.ceil(total / pageSize)})`
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      "[ADMIN_DAILY_REPORTS] Błąd podczas pobierania raportów dziennych:",
      error
    );
    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania raportów dziennych" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log(
      "[ADMIN_DAILY_REPORTS] Rozpoczynam generowanie raportu dziennego"
    );

    // Weryfikacja tokena
    const token = request.cookies.get("token")?.value;
    if (!token) {
      console.log("[ADMIN_DAILY_REPORTS] Brak tokena autoryzacji");
      return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      console.log("[ADMIN_DAILY_REPORTS] Nieprawidłowy token");
      return NextResponse.json(
        { error: "Nieprawidłowy token" },
        { status: 401 }
      );
    }

    // Sprawdzenie, czy użytkownik jest administratorem
    if (payload.role !== "admin") {
      console.log("[ADMIN_DAILY_REPORTS] Użytkownik nie jest administratorem");
      return NextResponse.json(
        { error: "Brak uprawnień administratora" },
        { status: 403 }
      );
    }

    // Pobranie danych z żądania
    const body = await request.json();
    const { placeId, reportDate } = body;

    // Walidacja danych
    if (!placeId || !reportDate) {
      console.log("[ADMIN_DAILY_REPORTS] Brak wymaganych danych");
      return NextResponse.json(
        { error: "Brak wymaganych danych" },
        { status: 400 }
      );
    }

    console.log("[ADMIN_DAILY_REPORTS] Dane żądania:", { placeId, reportDate });

    // Sprawdzenie, czy istnieją raporty dla danego miejsca i daty
    const checkReportsQuery = `
      SELECT id FROM reports 
      WHERE place_id = $1 AND report_date = $2
    `;
    const checkReportsResult = await db.query(checkReportsQuery, [
      placeId,
      reportDate,
    ]);

    if (checkReportsResult.rows.length === 0) {
      console.log(
        "[ADMIN_DAILY_REPORTS] Brak raportów dla podanego miejsca i daty"
      );
      return NextResponse.json(
        { error: "Brak raportów dla podanego miejsca i daty" },
        { status: 400 }
      );
    }

    // Generowanie raportu dziennego
    // Najpierw sprawdzamy, czy raport już istnieje
    const checkDailyReportQuery = `
      SELECT id FROM daily_reports 
      WHERE place_id = $1 AND report_date = $2
    `;
    const checkDailyReportResult = await db.query(checkDailyReportQuery, [
      placeId,
      reportDate,
    ]);

    if (checkDailyReportResult.rows.length > 0) {
      // Raport już istnieje, aktualizujemy go
      console.log(
        "[ADMIN_DAILY_REPORTS] Raport dzienny już istnieje, aktualizuję"
      );

      // Pobieramy dane z funkcji get_daily_report
      const getDailyReportQuery = `
        SELECT * FROM get_daily_report($1, $2)
      `;
      const getDailyReportResult = await db.query(getDailyReportQuery, [
        placeId,
        reportDate,
      ]);

      // Aktualizujemy raport dzienny
      const updateDailyReportQuery = `
        UPDATE daily_reports 
        SET summary_data = $1, created_at = NOW() 
        WHERE place_id = $2 AND report_date = $3
        RETURNING id
      `;
      const updateDailyReportResult = await db.query(updateDailyReportQuery, [
        getDailyReportResult.rows,
        placeId,
        reportDate,
      ]);

      console.log(
        "[ADMIN_DAILY_REPORTS] Raport dzienny zaktualizowany pomyślnie"
      );
      return NextResponse.json({
        message: "Raport dzienny zaktualizowany pomyślnie",
        id: updateDailyReportResult.rows[0].id,
      });
    } else {
      // Raport nie istnieje, tworzymy nowy
      console.log("[ADMIN_DAILY_REPORTS] Tworzę nowy raport dzienny");

      // Pobieramy dane z funkcji get_daily_report
      const getDailyReportQuery = `
        SELECT * FROM get_daily_report($1, $2)
      `;
      const getDailyReportResult = await db.query(getDailyReportQuery, [
        placeId,
        reportDate,
      ]);

      // Tworzymy nowy raport dzienny
      const createDailyReportQuery = `
        INSERT INTO daily_reports (place_id, report_date, summary_data, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id
      `;
      const createDailyReportResult = await db.query(createDailyReportQuery, [
        placeId,
        reportDate,
        getDailyReportResult.rows,
      ]);

      console.log("[ADMIN_DAILY_REPORTS] Raport dzienny utworzony pomyślnie");
      return NextResponse.json({
        message: "Raport dzienny utworzony pomyślnie",
        id: createDailyReportResult.rows[0].id,
      });
    }
  } catch (error) {
    console.error(
      "[ADMIN_DAILY_REPORTS] Błąd podczas generowania raportu dziennego:",
      error
    );
    return NextResponse.json(
      { error: "Wystąpił błąd podczas generowania raportu dziennego" },
      { status: 500 }
    );
  }
}
