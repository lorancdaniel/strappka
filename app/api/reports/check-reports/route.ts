import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get('placeId');
    const date = searchParams.get('date');

    console.log('[REPORTS_CHECK] Parametry zapytania:', { placeId, date });

    if (!placeId || !date) {
      console.log('[REPORTS_CHECK] Brak wymaganych parametrów');
      return new NextResponse('Missing placeId or date', { status: 400 });
    }

    // Konwersja placeId na liczbę
    const placeIdNumber = parseInt(placeId, 10);

    // Sprawdź liczbę raportów dla danego miejsca i daty
    const query = 'SELECT * FROM reports WHERE place_id = $1 AND report_date = $2';
    console.log('[REPORTS_CHECK] Wykonywane zapytanie:', query, [placeIdNumber, date]);

    const reports = await db.query(query, [placeIdNumber, date]);
    
    console.log('[REPORTS_CHECK] Znalezione raporty:', reports.rows);
    
    const reportCount = reports.rows.length;
    const hasAllReports = reportCount >= 2;

    console.log('[REPORTS_CHECK] Wynik:', { 
      placeIdNumber,
      reportCount, 
      hasAllReports,
      raportTypes: reports.rows.map(r => r.report_type)
    });

    return NextResponse.json({
      hasAllReports,
      reportCount,
      reports: reports.rows
    });

  } catch (error) {
    console.error('[REPORTS_CHECK] Błąd:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
