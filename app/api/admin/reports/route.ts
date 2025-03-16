import db from "@/lib/db";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    console.log("[ADMIN_REPORTS] Rozpoczynam pobieranie wszystkich raportów");

    // Weryfikacja tokena
    const token = request.cookies.get("token")?.value;
    if (!token) {
      console.log("[ADMIN_REPORTS] Brak tokena autoryzacji");
      return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      console.log("[ADMIN_REPORTS] Nieprawidłowy token");
      return NextResponse.json(
        { error: "Nieprawidłowy token" },
        { status: 401 }
      );
    }

    // Sprawdzenie, czy użytkownik jest administratorem
    if (payload.role !== "admin") {
      console.log("[ADMIN_REPORTS] Użytkownik nie jest administratorem");
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
    const reportType = searchParams.get("reportType");
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    console.log("[ADMIN_REPORTS] Parametry zapytania:", {
      page,
      pageSize,
      placeId,
      startDate,
      endDate,
      reportType,
      sortBy,
      sortOrder,
    });

    // Walidacja parametrów
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      console.log("[ADMIN_REPORTS] Nieprawidłowe parametry paginacji");
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
        r.id, 
        r.place_id, 
        r.report_date, 
        r.report_type, 
        r.terminal_shipment_report, 
        r.cash_for_change, 
        r.work_hours, 
        r.deposited_cash, 
        r.initial_cash, 
        r.created_at,
        p.name as place_name,
        u.name || ' ' || u.surname as user_name
      FROM reports r
      JOIN places p ON r.place_id = p.id
      JOIN users u ON r.user_id = u.id
    `;

    // Dodawanie warunków filtrowania
    if (placeId) {
      queryConditions.push(`r.place_id = $${paramIndex++}`);
      queryParams.push(parseInt(placeId, 10));
    }

    if (startDate) {
      queryConditions.push(`r.report_date >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      queryConditions.push(`r.report_date <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    if (reportType) {
      queryConditions.push(`r.report_type = $${paramIndex++}`);
      queryParams.push(reportType);
    }

    // Dodanie warunków do zapytania
    if (queryConditions.length > 0) {
      query += ` WHERE ${queryConditions.join(" AND ")}`;
    }

    // Zapytanie o całkowitą liczbę rekordów
    const countQuery = `
      SELECT COUNT(*) as total
      FROM reports r
      JOIN places p ON r.place_id = p.id
      JOIN users u ON r.user_id = u.id
      ${
        queryConditions.length > 0
          ? `WHERE ${queryConditions.join(" AND ")}`
          : ""
      }
    `;

    console.log("[ADMIN_REPORTS] Zapytanie o liczbę rekordów:", {
      query: countQuery,
      params: queryParams,
    });

    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Dodanie sortowania i paginacji
    query += ` ORDER BY ${sortBy} ${sortOrder === "asc" ? "ASC" : "DESC"}`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(pageSize);
    queryParams.push((page - 1) * pageSize);

    console.log("[ADMIN_REPORTS] Zapytanie o raporty:", {
      query,
      params: queryParams,
    });

    // Wykonanie zapytania
    const result = await db.query(query, queryParams);

    // Przygotowanie odpowiedzi
    const response = {
      reports: result.rows,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };

    console.log(
      `[ADMIN_REPORTS] Pobrano ${
        result.rows.length
      } raportów (strona ${page}/${Math.ceil(total / pageSize)})`
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("[ADMIN_REPORTS] Błąd podczas pobierania raportów:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania raportów" },
      { status: 500 }
    );
  }
}
