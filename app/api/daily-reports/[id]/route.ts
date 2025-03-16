import db from "@/lib/db";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(
      "[DAILY_REPORT_DETAILS] Rozpoczynam pobieranie szczegółów raportu dziennego"
    );

    // Weryfikacja tokena
    const token = request.cookies.get("token")?.value;
    if (!token) {
      console.log("[DAILY_REPORT_DETAILS] Brak tokena autoryzacji");
      return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      console.log("[DAILY_REPORT_DETAILS] Nieprawidłowy token");
      return NextResponse.json(
        { error: "Nieprawidłowy token" },
        { status: 401 }
      );
    }

    // Pobranie ID raportu z parametrów
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      console.log("[DAILY_REPORT_DETAILS] Nieprawidłowe ID raportu");
      return NextResponse.json(
        { error: "Nieprawidłowe ID raportu" },
        { status: 400 }
      );
    }

    console.log("[DAILY_REPORT_DETAILS] ID raportu:", id);

    // Pobranie szczegółów raportu dziennego
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
      WHERE dr.id = $1
    `;

    // Jeśli użytkownik nie jest adminem, dodaj warunek dostępu do miejsca
    const queryParams = [id];
    if (payload.role !== "admin") {
      query += ` AND dr.place_id IN (
        SELECT place_id FROM user_places WHERE user_id = $2
      )`;
      queryParams.push(payload.id);
    }

    const result = await db.query(query, queryParams);

    if (result.rows.length === 0) {
      console.log(
        "[DAILY_REPORT_DETAILS] Raport dzienny nie istnieje lub brak dostępu"
      );
      return NextResponse.json(
        { error: "Raport dzienny nie istnieje lub brak dostępu" },
        { status: 404 }
      );
    }

    const row = result.rows[0];

    // Jeśli summary_data jest tablicą, weź pierwszy element
    const summaryData =
      Array.isArray(row.summary_data) && row.summary_data.length > 0
        ? row.summary_data[0]
        : row.summary_data;

    // Przygotowanie danych raportu
    const report = {
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
      fruits: summaryData?.fruits || [],
    };

    console.log("[DAILY_REPORT_DETAILS] Pobrano szczegóły raportu dziennego");

    return NextResponse.json(report);
  } catch (error) {
    console.error(
      "[DAILY_REPORT_DETAILS] Błąd podczas pobierania szczegółów raportu dziennego:",
      error
    );
    return NextResponse.json(
      {
        error: "Wystąpił błąd podczas pobierania szczegółów raportu dziennego",
      },
      { status: 500 }
    );
  }
}
