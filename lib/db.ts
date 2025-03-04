import { Pool } from "pg";

const db = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "8513",
  database: "strappka",
});

// Nasłuchiwanie na błędy połączenia
db.on("error", (err) => {
  console.error("Nieoczekiwany błąd w puli połączeń PostgreSQL", err);
});

// Testowanie połączenia
db.connect((err, client, release) => {
  if (err) {
    console.error("Błąd podczas łączenia z bazą danych:", err.message);
    return;
  }
  if (client) {
    client.query("SELECT NOW()", (err, result) => {
      release();
      if (err) {
        console.error(
          "Błąd podczas wykonywania zapytania testowego:",
          err.message
        );
        return;
      }
      console.log(
        "Połączenie z bazą danych działa poprawnie. Czas serwera:",
        result.rows[0].now
      );
    });
  }
});

export default db;
