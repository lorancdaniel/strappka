import db from "@/lib/db";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get("placeId");
    const date = searchParams.get("date");

    if (!placeId || !date) {
      return NextResponse.json(
        { success: false, error: "Brak wymaganych parametrów" },
        { status: 400 }
      );
    }

    const result = await db.query(
      `SELECT EXISTS (
        SELECT 1
        FROM reports
        WHERE place_id = $1
        AND report_date = $2
        AND report_type = 'end'
      ) as has_end_report`,
      [placeId, date]
    );

    return NextResponse.json({
      success: true,
      hasEndReport: result.rows[0].has_end_report,
    });
  } catch (error) {
    console.error("Błąd podczas sprawdzania raportu końcowego:", error);
    return NextResponse.json(
      { success: false, error: "Wystąpił błąd podczas sprawdzania raportu" },
      { status: 500 }
    );
  }
}
