import { db } from "../db/connection";

interface Fruit {
  fruit_type: string;
  fruit_id?: number;
  initialQuantity?: number;
  pricePerKg?: number;
  remainingQuantity?: number;
  wasteQuantity?: number;
  grossSales?: number;
}

interface StartReportData {
  placeId: number;
  userId: number;
  reportDate: string;
  terminalShipmentReport: string;
  workHours: number;
  initialCash: number;
  cashForChange: number;
  fruits: Fruit[];
}

interface EndReportData {
  placeId: number;
  userId: number;
  reportDate: string;
  terminalShipmentReport: string;
  workHours: number;
  depositedCash: number;
  fruits: Fruit[];
}

interface DailyReportFruit {
  fruit_name: string;
  initial_quantity: number;
  remaining_quantity: number;
  waste_quantity: number;
  sold_quantity: number;
  price_per_kg: number;
  start_price_per_kg: number;
  end_price_per_kg: number;
  gross_sales: number;
  net_sales: number;
}

interface DailyReport {
  place_name: string;
  report_date: string;
  has_start_report: boolean;
  has_end_report: boolean;
  start_user_name: string;
  end_user_name: string;
  start_work_hours: number;
  end_work_hours: number;
  initial_cash: number;
  deposited_cash: number;
  fruits: DailyReportFruit[];
}

export class ReportService {
  /**
   * Tworzy raport początkowy
   * @param data Dane raportu początkowego
   * @returns Identyfikator utworzonego raportu
   */
  async createStartReport(data: StartReportData): Promise<{ id: number }> {
    try {
      // Rozpoczęcie transakcji
      await db.query("BEGIN");

      // Dodanie raportu początkowego
      const insertReportQuery = `
        INSERT INTO reports (
          place_id, 
          user_id, 
          report_date, 
          report_type, 
          terminal_shipment_report, 
          work_hours, 
          initial_cash, 
          cash_for_change
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;

      const reportValues = [
        data.placeId,
        data.userId,
        data.reportDate,
        "start",
        data.terminalShipmentReport,
        data.workHours,
        data.initialCash,
        data.cashForChange,
      ];

      const reportResult = await db.query(insertReportQuery, reportValues);
      const reportId = reportResult.rows[0].id;

      // Dodanie owoców do raportu
      for (const fruit of data.fruits) {
        const insertFruitQuery = `
          INSERT INTO report_fruits (
            report_id, 
            fruit_id, 
            initial_quantity, 
            price_per_kg
          )
          VALUES ($1, $2, $3, $4)
        `;

        const fruitValues = [
          reportId,
          fruit.fruit_id,
          fruit.initialQuantity,
          fruit.pricePerKg,
        ];

        await db.query(insertFruitQuery, fruitValues);
      }

      // Zatwierdzenie transakcji
      await db.query("COMMIT");

      return { id: reportId };
    } catch (error) {
      // Wycofanie transakcji w przypadku błędu
      await db.query("ROLLBACK");
      throw error;
    }
  }

  /**
   * Tworzy raport końcowy
   * @param data Dane raportu końcowego
   * @returns Identyfikator utworzonego raportu
   */
  async createEndReport(data: EndReportData): Promise<{ id: number }> {
    try {
      // Rozpoczęcie transakcji
      await db.query("BEGIN");

      // Dodanie raportu końcowego
      const insertReportQuery = `
        INSERT INTO reports (
          place_id, 
          user_id, 
          report_date, 
          report_type, 
          terminal_shipment_report, 
          work_hours, 
          deposited_cash
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;

      const reportValues = [
        data.placeId,
        data.userId,
        data.reportDate,
        "end",
        data.terminalShipmentReport,
        data.workHours,
        data.depositedCash,
      ];

      const reportResult = await db.query(insertReportQuery, reportValues);
      const reportId = reportResult.rows[0].id;

      // Dodanie owoców do raportu
      for (const fruit of data.fruits) {
        const insertFruitQuery = `
          INSERT INTO report_fruits (
            report_id, 
            fruit_id, 
            remaining_quantity, 
            waste_quantity, 
            gross_sales
          )
          VALUES ($1, $2, $3, $4, $5)
        `;

        const fruitValues = [
          reportId,
          fruit.fruit_id,
          fruit.remainingQuantity,
          fruit.wasteQuantity,
          fruit.grossSales,
        ];

        await db.query(insertFruitQuery, fruitValues);
      }

      // Zatwierdzenie transakcji
      await db.query("COMMIT");

      return { id: reportId };
    } catch (error) {
      // Wycofanie transakcji w przypadku błędu
      await db.query("ROLLBACK");
      throw error;
    }
  }

  /**
   * Pobiera raport dzienny
   * @param placeId Identyfikator miejsca
   * @param reportDate Data raportu
   * @returns Raport dzienny lub null, jeśli nie istnieje
   */
  async getDailyReport(
    placeId: number,
    reportDate: string
  ): Promise<DailyReport | null> {
    try {
      const query = `
        SELECT summary_data
        FROM daily_reports
        WHERE place_id = $1 AND report_date = $2
      `;

      const result = await db.query(query, [placeId, reportDate]);

      if (result.rowCount === 0) {
        console.log(
          `[getDailyReport] Nie znaleziono raportu dla miejsca ${placeId} i daty ${reportDate}`
        );
        return null;
      }

      // Przekształcenie danych z formatu JSON
      const summaryData = result.rows[0]?.summary_data;

      // Sprawdź, czy summaryData istnieje
      if (!summaryData) {
        console.log(`[getDailyReport] Brak danych summary_data dla raportu`);
        return null;
      }

      console.log(
        `[getDailyReport] Struktura summaryData:`,
        JSON.stringify(summaryData, null, 2)
      );

      // Sprawdzenie, czy dane są w formacie tablicy
      if (!Array.isArray(summaryData) || summaryData.length === 0) {
        console.log(
          `[getDailyReport] Nieprawidłowa struktura danych - nie jest tablicą lub jest pusta`
        );
        return null;
      }

      // Pobierz pierwszy element dla danych ogólnych
      const reportData = summaryData[0];
      console.log(
        `[getDailyReport] Pierwszy element (reportData):`,
        JSON.stringify(reportData, null, 2)
      );

      // Przekształcenie danych o owocach
      const fruits = summaryData.map((item) => ({
        fruit_name: item.fruit_name,
        initial_quantity: parseFloat(item.initial_quantity) || 0,
        remaining_quantity: parseFloat(item.remaining_quantity) || 0,
        waste_quantity: parseFloat(item.waste_quantity) || 0,
        sold_quantity: parseFloat(item.sold_quantity) || 0,
        price_per_kg: parseFloat(item.price_per_kg) || 0,
        start_price_per_kg: parseFloat(item.start_price_per_kg) || 0,
        end_price_per_kg: parseFloat(item.end_price_per_kg) || 0,
        gross_sales: parseFloat(item.gross_sales) || 0,
        net_sales: parseFloat(item.net_sales) || 0,
      }));
      console.log(
        `[getDailyReport] Przekształcone dane o owocach:`,
        JSON.stringify(fruits, null, 2)
      );

      // Utworzenie obiektu raportu dziennego
      const dailyReport: DailyReport = {
        place_name: reportData.place_name,
        report_date: reportData.report_date,
        has_start_report:
          reportData.has_start_report === "true" ||
          reportData.has_start_report === true,
        has_end_report:
          reportData.has_end_report === "true" ||
          reportData.has_end_report === true,
        start_user_name: reportData.start_user_name || "",
        end_user_name: reportData.end_user_name || "",
        start_work_hours: parseFloat(reportData.start_work_hours) || 0,
        end_work_hours: parseFloat(reportData.end_work_hours) || 0,
        initial_cash: parseFloat(reportData.initial_cash) || 0,
        deposited_cash: parseFloat(reportData.deposited_cash) || 0,
        fruits,
      };
      console.log(
        `[getDailyReport] Końcowy obiekt dailyReport:`,
        JSON.stringify(dailyReport, null, 2)
      );

      return dailyReport;
    } catch (error) {
      console.error(`[getDailyReport] Błąd:`, error);
      throw error;
    }
  }
}
