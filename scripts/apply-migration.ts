const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

// Konfiguracja połączenia z bazą danych
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "strappka",
  password: process.env.DB_PASSWORD || "postgres",
  port: parseInt(process.env.DB_PORT || "5432"),
});

// Obiekt db z metodą query
const db = {
  query: (text, params) => pool.query(text, params),
};

async function applyMigration() {
  try {
    // Pobierz nazwę pliku migracji z argumentów wiersza poleceń lub użyj domyślnej
    const migrationFile = process.argv[2] || "disable_report_triggers.sql";

    // Ścieżka do pliku migracji
    const migrationPath = path.join(process.cwd(), "migrations", migrationFile);

    // Sprawdź, czy plik migracji istnieje
    if (!fs.existsSync(migrationPath)) {
      console.error(`Błąd: Plik migracji ${migrationFile} nie istnieje`);
      console.log("Dostępne migracje:");

      // Wyświetl listę dostępnych migracji
      const migrationsDir = path.join(process.cwd(), "migrations");
      const migrations = fs
        .readdirSync(migrationsDir)
        .filter((file) => file.endsWith(".sql"));

      migrations.forEach((file) => {
        console.log(`- ${file}`);
      });

      process.exit(1);
    }

    // Odczytanie zawartości pliku migracji
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log(`Rozpoczynam wykonywanie migracji ${migrationFile}...`);

    // Wykonanie zapytania SQL
    await db.query(migrationSQL);

    console.log(`Migracja ${migrationFile} została pomyślnie wykonana!`);
  } catch (error) {
    console.error("Błąd podczas wykonywania migracji:", error);
    process.exit(1);
  } finally {
    // Zamknij połączenie z bazą danych
    await pool.end();
  }
}

// Wykonanie migracji
applyMigration();
