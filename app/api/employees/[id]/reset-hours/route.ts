import { NextResponse } from "next/server";
import db from "@/lib/db";
import { type NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const query = `
      UPDATE users
      SET working_hours = 0
      WHERE id = $1
      RETURNING *
    `;

    const res = await db.query(query, [id]);

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Nie znaleziono pracownika" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: res.rows[0],
    });
  } catch (error) {
    console.error("Błąd podczas resetowania godzin:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas resetowania godzin" },
      { status: 500 }
    );
  }
}
