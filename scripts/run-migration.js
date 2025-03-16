const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const dotenv = require("dotenv");

// Załaduj zmienne środowiskowe
dotenv.config();

// Konfiguracja połączenia z bazą danych
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration(filePath) {
  console.log(`Uruchamianie migracji: ${filePath}`);

  try {
    // Odczytaj plik SQL
    const sql = fs.readFileSync(filePath, "utf8");

    // Połącz się z bazą danych i wykonaj zapytanie
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("COMMIT");
      console.log(`Migracja ${filePath} zakończona sukcesem`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`Błąd podczas wykonywania migracji ${filePath}:`, err);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(`Błąd podczas odczytu pliku migracji ${filePath}:`, err);
    throw err;
  }
}

async function main() {
  // Pobierz nazwę pliku migracji z argumentów wiersza poleceń
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error("Podaj nazwę pliku migracji jako argument");
    process.exit(1);
  }

  const migrationPath = path.join(__dirname, "..", "migrations", migrationFile);

  if (!fs.existsSync(migrationPath)) {
    console.error(`Plik migracji ${migrationPath} nie istnieje`);
    process.exit(1);
  }

  try {
    await runMigration(migrationPath);
    console.log("Migracja zakończona sukcesem");
    process.exit(0);
  } catch (err) {
    console.error("Migracja zakończona niepowodzeniem:", err);
    process.exit(1);
  }
}

main();
