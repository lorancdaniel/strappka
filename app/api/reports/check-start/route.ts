import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get('placeId');
    const date = searchParams.get('date');

    if (!placeId || !date) {
      return NextResponse.json(
        { success: false, error: 'Brak wymaganych parametrów' },
        { status: 400 }
      );
    }

    const result = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM reports 
        WHERE place_id = ${placeId}
        AND report_date = ${date}::date
        AND report_type = 'start'
      ) as has_start_report;
    `;

    return NextResponse.json({
      success: true,
      hasStartReport: result.rows[0].has_start_report
    });

  } catch (error) {
    console.error('Błąd podczas sprawdzania raportu początkowego:', error);
    return NextResponse.json(
      { success: false, error: 'Wystąpił błąd podczas sprawdzania raportu' },
      { status: 500 }
    );
  }
}
