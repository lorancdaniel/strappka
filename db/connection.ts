import { Pool, QueryResult } from "pg";

// Konfiguracja połączenia z bazą danych
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "strappka",
  password: process.env.DB_PASSWORD || "postgres",
  port: parseInt(process.env.DB_PORT || "5432"),
});

// Eksport obiektu db z metodą query
export const db = {
  /**
   * Wykonuje zapytanie SQL do bazy danych
   * @param text Zapytanie SQL
   * @param params Parametry zapytania
   * @returns Wynik zapytania
   */
  query: (text: string, params?: unknown[]): Promise<QueryResult> =>
    pool.query(text, params),

  /**
   * Pobiera klienta z puli połączeń
   * @returns Klient bazy danych
   */
  getClient: async () => {
    const client = await pool.connect();
    return client;
  },
};
