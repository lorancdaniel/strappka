-- Skrypt tworzenia nowej bazy danych Strappka
-- Autor: System
-- Data: 2023

-- 1. Tworzenie tabel podstawowych
CREATE TABLE IF NOT EXISTS fruits (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  place_id INTEGER NOT NULL,
  fruit_id INTEGER NOT NULL,
  quantity NUMERIC(10, 2) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(place_id, fruit_id)
);

CREATE TABLE IF NOT EXISTS user_places (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  place_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, place_id)
);

CREATE TABLE IF NOT EXISTS user_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  action VARCHAR(50) NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS places (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  surname VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  type_of_user INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  place_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  report_date DATE NOT NULL,
  report_type VARCHAR(10) NOT NULL CHECK (report_type IN ('start', 'end')),
  terminal_shipment_report VARCHAR(255) NOT NULL,
  work_hours NUMERIC(5, 2) NOT NULL,
  initial_cash NUMERIC(10, 2),
  cash_for_change NUMERIC(10, 2),
  deposited_cash NUMERIC(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(place_id, report_date, report_type)
);

CREATE TABLE IF NOT EXISTS report_fruits (
  id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL,
  fruit_id INTEGER NOT NULL,
  initial_quantity NUMERIC(10, 2) NOT NULL,
  price_per_kg NUMERIC(10, 2) NOT NULL,
  remaining_quantity NUMERIC(10, 2),
  waste_quantity NUMERIC(10, 2),
  gross_sales NUMERIC(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(report_id, fruit_id)
);

-- 2. Dodawanie kluczy obcych i indeksów
ALTER TABLE inventory
  ADD CONSTRAINT fk_inventory_place FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_inventory_fruit FOREIGN KEY (fruit_id) REFERENCES fruits(id) ON DELETE CASCADE;

ALTER TABLE user_places
  ADD CONSTRAINT fk_user_places_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_user_places_place FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE;

ALTER TABLE user_logs
  ADD CONSTRAINT fk_user_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE reports
  ADD CONSTRAINT fk_reports_place FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE report_fruits
  ADD CONSTRAINT fk_report_fruits_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_report_fruits_fruit FOREIGN KEY (fruit_id) REFERENCES fruits(id) ON DELETE CASCADE;

-- Tworzenie indeksów
CREATE INDEX idx_reports_place_date ON reports(place_id, report_date);
CREATE INDEX idx_report_fruits_report_id ON report_fruits(report_id);
CREATE INDEX idx_inventory_place_id ON inventory(place_id);
CREATE INDEX idx_user_places_user_id ON user_places(user_id);
CREATE INDEX idx_user_places_place_id ON user_places(place_id);
CREATE INDEX idx_user_logs_user_id ON user_logs(user_id);
CREATE INDEX idx_user_logs_created_at ON user_logs(created_at);

-- 3. Tworzenie triggerów i procedur
-- Trigger do aktualizacji stanu magazynowego po dodaniu raportu końcowego
CREATE OR REPLACE FUNCTION update_inventory_after_end_report()
RETURNS TRIGGER AS $$
DECLARE
  fruit_record RECORD;
BEGIN
  -- Aktualizacja stanu magazynowego tylko dla raportów końcowych
  IF NEW.report_type = 'end' THEN
    -- Dla każdego owocu w raporcie
    FOR fruit_record IN 
      SELECT fruit_id, remaining_quantity 
      FROM report_fruits 
      WHERE report_id = NEW.id
    LOOP
      -- Aktualizuj stan magazynowy
      UPDATE inventory
      SET quantity = fruit_record.remaining_quantity,
          last_updated = NOW()
      WHERE place_id = NEW.place_id AND fruit_id = fruit_record.fruit_id;
      
      -- Jeśli nie istnieje rekord w inventory, dodaj go
      IF NOT FOUND THEN
        INSERT INTO inventory (place_id, fruit_id, quantity, last_updated)
        VALUES (NEW.place_id, fruit_record.fruit_id, fruit_record.remaining_quantity, NOW());
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_trigger
AFTER INSERT ON reports
FOR EACH ROW
EXECUTE FUNCTION update_inventory_after_end_report();

-- Trigger do logowania zmian w raportach
CREATE OR REPLACE FUNCTION log_report_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_logs (user_id, action, details)
  VALUES (
    NEW.user_id,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'report_created'
      WHEN TG_OP = 'UPDATE' THEN 'report_updated'
      WHEN TG_OP = 'DELETE' THEN 'report_deleted'
    END,
    jsonb_build_object(
      'report_id', NEW.id,
      'place_id', NEW.place_id,
      'report_date', NEW.report_date,
      'report_type', NEW.report_type
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_report_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON reports
FOR EACH ROW
EXECUTE FUNCTION log_report_changes();

-- Procedura do generowania raportu dziennego dla stanowiska
CREATE OR REPLACE FUNCTION get_daily_report(p_place_id INTEGER, p_date DATE)
RETURNS TABLE (
  place_name VARCHAR,
  report_date DATE,
  has_start_report BOOLEAN,
  has_end_report BOOLEAN,
  start_user_name TEXT,
  end_user_name TEXT,
  work_hours NUMERIC,
  initial_cash NUMERIC,
  deposited_cash NUMERIC,
  fruit_name VARCHAR,
  initial_quantity NUMERIC,
  remaining_quantity NUMERIC,
  waste_quantity NUMERIC,
  sold_quantity NUMERIC,
  price_per_kg NUMERIC,
  gross_sales NUMERIC,
  net_sales NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH start_report AS (
    SELECT r.*, u.name || ' ' || u.surname AS user_name
    FROM reports r
    JOIN users u ON r.user_id = u.id
    WHERE r.place_id = p_place_id AND r.report_date = p_date AND r.report_type = 'start'
  ),
  end_report AS (
    SELECT r.*, u.name || ' ' || u.surname AS user_name
    FROM reports r
    JOIN users u ON r.user_id = u.id
    WHERE r.place_id = p_place_id AND r.report_date = p_date AND r.report_type = 'end'
  ),
  fruit_data AS (
    SELECT 
      f.name AS fruit_name,
      sf.initial_quantity,
      ef.remaining_quantity,
      ef.waste_quantity,
      sf.initial_quantity - COALESCE(ef.remaining_quantity, 0) - COALESCE(ef.waste_quantity, 0) AS sold_quantity,
      sf.price_per_kg,
      ef.gross_sales,
      ef.gross_sales - (sf.price_per_kg * (sf.initial_quantity - COALESCE(ef.remaining_quantity, 0) - COALESCE(ef.waste_quantity, 0))) AS net_sales
    FROM start_report sr
    JOIN report_fruits sf ON sr.id = sf.report_id
    JOIN fruits f ON sf.fruit_id = f.id
    LEFT JOIN end_report er ON 1=1
    LEFT JOIN report_fruits ef ON er.id = ef.report_id AND sf.fruit_id = ef.fruit_id
  )
  SELECT 
    p.name AS place_name,
    p_date AS report_date,
    CASE WHEN EXISTS (SELECT 1 FROM start_report) THEN TRUE ELSE FALSE END AS has_start_report,
    CASE WHEN EXISTS (SELECT 1 FROM end_report) THEN TRUE ELSE FALSE END AS has_end_report,
    (SELECT user_name FROM start_report LIMIT 1) AS start_user_name,
    (SELECT user_name FROM end_report LIMIT 1) AS end_user_name,
    COALESCE((SELECT work_hours FROM end_report LIMIT 1), (SELECT work_hours FROM start_report LIMIT 1)) AS work_hours,
    (SELECT initial_cash FROM start_report LIMIT 1) AS initial_cash,
    (SELECT deposited_cash FROM end_report LIMIT 1) AS deposited_cash,
    fd.fruit_name,
    fd.initial_quantity,
    fd.remaining_quantity,
    fd.waste_quantity,
    fd.sold_quantity,
    fd.price_per_kg,
    fd.gross_sales,
    fd.net_sales
  FROM places p
  CROSS JOIN fruit_data fd
  WHERE p.id = p_place_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Dodanie domyślnych danych (opcjonalnie)
-- Dodanie podstawowych typów owoców
INSERT INTO fruits (name) VALUES 
  ('truskawka'),
  ('czeresnia'),
  ('borowka'),
  ('malina'),
  ('jagoda'),
  ('wisnia'),
  ('agrest'),
  ('jajka')
ON CONFLICT (name) DO NOTHING;

-- Dodanie administratora (hasło należy zmienić)
INSERT INTO users (name, surname, email, password, type_of_user)
VALUES ('Admin', 'System', 'admin@strappka.pl', '$2b$10$XpC5Jy2PUoD0NqPnYkzJme4OfgmSFZHWD5jnwXpHBhx4PcQqe3z6W', 1)
ON CONFLICT (email) DO NOTHING; 