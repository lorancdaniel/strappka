-- Najpierw usuwamy istniejącą funkcję
DROP FUNCTION IF EXISTS get_daily_report(INTEGER, DATE);

-- Uproszczona funkcja do pobierania danych raportu dziennego
CREATE OR REPLACE FUNCTION get_daily_report(p_place_id INTEGER, p_report_date DATE)
RETURNS TABLE (
  report_data JSON
) AS $$
BEGIN
  RETURN QUERY
  WITH start_report AS (
    SELECT 
      r.id,
      r.place_id,
      r.report_date,
      r.report_type,
      r.terminal_shipment_report,
      r.work_hours,
      r.initial_cash,
      r.deposited_cash,
      r.created_at,
      u.name || ' ' || u.surname AS user_name
    FROM reports r
    JOIN users u ON r.user_id = u.id
    WHERE r.place_id = p_place_id AND r.report_date = p_report_date AND r.report_type = 'start'
  ),
  end_report AS (
    SELECT 
      r.id,
      r.place_id,
      r.report_date,
      r.report_type,
      r.terminal_shipment_report,
      r.work_hours,
      r.initial_cash,
      r.deposited_cash,
      r.created_at,
      u.name || ' ' || u.surname AS user_name
    FROM reports r
    JOIN users u ON r.user_id = u.id
    WHERE r.place_id = p_place_id AND r.report_date = p_report_date AND r.report_type = 'end'
  ),
  start_fruits AS (
    SELECT 
      rf.report_id,
      rf.fruit_id,
      rf.initial_quantity,
      rf.remaining_quantity,
      rf.waste_quantity,
      rf.price_per_kg,
      rf.gross_sales,
      f.name AS fruit_name
    FROM start_report sr
    JOIN report_fruits rf ON sr.id = rf.report_id
    JOIN fruits f ON rf.fruit_id = f.id
  ),
  end_fruits AS (
    SELECT 
      rf.report_id,
      rf.fruit_id,
      rf.initial_quantity,
      rf.remaining_quantity,
      rf.waste_quantity,
      rf.price_per_kg,
      rf.gross_sales,
      f.name AS fruit_name
    FROM end_report er
    JOIN report_fruits rf ON er.id = rf.report_id
    JOIN fruits f ON rf.fruit_id = f.id
  ),
  combined_fruits AS (
    SELECT 
      COALESCE(sf.fruit_name, ef.fruit_name) AS fruit_name,
      COALESCE(sf.initial_quantity, 0) AS initial_quantity,
      COALESCE(ef.remaining_quantity, 0) AS remaining_quantity,
      COALESCE(ef.waste_quantity, 0) AS waste_quantity,
      COALESCE(sf.initial_quantity, 0) - COALESCE(ef.remaining_quantity, 0) - COALESCE(ef.waste_quantity, 0) AS sold_quantity,
      COALESCE(sf.price_per_kg, 0) AS start_price_per_kg,
      COALESCE(ef.price_per_kg, 0) AS end_price_per_kg,
      (COALESCE(sf.price_per_kg, 0) + COALESCE(ef.price_per_kg, 0)) / 
        CASE WHEN (COALESCE(sf.price_per_kg, 0) > 0 AND COALESCE(ef.price_per_kg, 0) > 0) THEN 2 
             WHEN (COALESCE(sf.price_per_kg, 0) > 0 OR COALESCE(ef.price_per_kg, 0) > 0) THEN 1
             ELSE 1 END AS price_per_kg,
      COALESCE(ef.gross_sales, 0) AS gross_sales,
      COALESCE(ef.gross_sales, 0) - (
        (COALESCE(sf.initial_quantity, 0) - COALESCE(ef.remaining_quantity, 0) - COALESCE(ef.waste_quantity, 0)) * 
        COALESCE(sf.price_per_kg, 0)
      ) AS net_sales
    FROM start_fruits sf
    FULL OUTER JOIN end_fruits ef ON sf.fruit_id = ef.fruit_id
  ),
  totals AS (
    SELECT 
      SUM(cf.initial_quantity) AS total_initial_quantity,
      SUM(cf.remaining_quantity) AS total_remaining_quantity,
      SUM(cf.waste_quantity) AS total_waste_quantity,
      SUM(cf.sold_quantity) AS total_sold_quantity,
      SUM(cf.gross_sales) AS total_gross_sales,
      SUM(cf.sold_quantity * cf.price_per_kg) AS total_calculated_sales
    FROM combined_fruits cf
  ),
  fruit_data AS (
    SELECT json_agg(
      json_build_object(
        'fruit_name', cf.fruit_name,
        'initial_quantity', cf.initial_quantity,
        'remaining_quantity', cf.remaining_quantity,
        'waste_quantity', cf.waste_quantity,
        'sold_quantity', cf.sold_quantity,
        'price_per_kg', cf.price_per_kg,
        'start_price_per_kg', cf.start_price_per_kg,
        'end_price_per_kg', cf.end_price_per_kg,
        'gross_sales', cf.gross_sales,
        'net_sales', cf.net_sales
      )
    ) AS fruits_json
    FROM combined_fruits cf
  )
  SELECT 
    json_build_object(
      'place_name', p.name,
      'report_date', p_report_date,
      'has_start_report', CASE WHEN EXISTS (SELECT 1 FROM start_report) THEN TRUE ELSE FALSE END,
      'has_end_report', CASE WHEN EXISTS (SELECT 1 FROM end_report) THEN TRUE ELSE FALSE END,
      'start_report_id', (SELECT sr.id FROM start_report sr LIMIT 1),
      'end_report_id', (SELECT er.id FROM end_report er LIMIT 1),
      'start_user_name', (SELECT sr.user_name FROM start_report sr LIMIT 1),
      'end_user_name', (SELECT er.user_name FROM end_report er LIMIT 1),
      'start_work_hours', COALESCE((SELECT sr.work_hours FROM start_report sr LIMIT 1), 0),
      'end_work_hours', COALESCE((SELECT er.work_hours FROM end_report er LIMIT 1), 0),
      'initial_cash', COALESCE((SELECT sr.initial_cash FROM start_report sr LIMIT 1), 0),
      'deposited_cash', COALESCE((SELECT er.deposited_cash FROM end_report er LIMIT 1), 0),
      'start_terminal_report', COALESCE((SELECT sr.terminal_shipment_report FROM start_report sr LIMIT 1), ''),
      'end_terminal_report', COALESCE((SELECT er.terminal_shipment_report FROM end_report er LIMIT 1), ''),
      'total_initial_quantity', COALESCE((SELECT t.total_initial_quantity FROM totals t), 0),
      'total_remaining_quantity', COALESCE((SELECT t.total_remaining_quantity FROM totals t), 0),
      'total_waste_quantity', COALESCE((SELECT t.total_waste_quantity FROM totals t), 0),
      'total_sold_quantity', COALESCE((SELECT t.total_sold_quantity FROM totals t), 0),
      'total_gross_sales', COALESCE((SELECT t.total_gross_sales FROM totals t), 0),
      'total_calculated_sales', COALESCE((SELECT t.total_calculated_sales FROM totals t), 0),
      'fruits', COALESCE((SELECT fd.fruits_json FROM fruit_data fd), '[]'::json)
    ) AS report_data
  FROM places p
  WHERE p.id = p_place_id;
END;
$$ LANGUAGE plpgsql;

-- Aktualizacja funkcji generate_daily_report, aby używała nowej funkcji get_daily_report
CREATE OR REPLACE FUNCTION generate_daily_report()
RETURNS TRIGGER AS $$
DECLARE
  daily_report_id INTEGER;
  summary_json JSONB;
BEGIN
  -- Sprawdź, czy istnieje już raport dzienny dla tego miejsca i daty
  SELECT id INTO daily_report_id
  FROM daily_reports
  WHERE place_id = NEW.place_id AND report_date = NEW.report_date;

  -- Pobierz dane z funkcji get_daily_report
  SELECT COALESCE(jsonb_agg(report_data), '[]'::jsonb) INTO summary_json
  FROM get_daily_report(NEW.place_id, NEW.report_date);

  -- Jeśli nie ma żadnych danych, ustaw domyślną wartość jako pusty array JSON
  IF summary_json IS NULL OR summary_json = 'null'::jsonb THEN
    summary_json := '[]'::jsonb;
  END IF;

  IF daily_report_id IS NULL THEN
    -- Jeśli nie istnieje, utwórz nowy raport dzienny
    INSERT INTO daily_reports (place_id, report_date, summary_data, created_at)
    VALUES (
      NEW.place_id, 
      NEW.report_date, 
      summary_json,
      NOW()
    );
  ELSE
    -- Jeśli istnieje, zaktualizuj istniejący raport dzienny
    UPDATE daily_reports
    SET 
      summary_data = summary_json,
      created_at = NOW()
    WHERE id = daily_report_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql; 