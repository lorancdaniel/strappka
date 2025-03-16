-- Funkcja do pobierania danych raportu dziennego na podstawie place_id i report_date
CREATE OR REPLACE FUNCTION get_daily_report(p_place_id INTEGER, p_report_date DATE)
RETURNS TABLE (
  place_name VARCHAR,
  report_date DATE,
  has_start_report BOOLEAN,
  has_end_report BOOLEAN,
  start_report_id INTEGER,
  end_report_id INTEGER,
  start_user_name TEXT,
  end_user_name TEXT,
  start_work_hours NUMERIC,
  end_work_hours NUMERIC,
  initial_cash NUMERIC,
  deposited_cash NUMERIC,
  start_terminal_report TEXT,
  end_terminal_report TEXT,
  total_initial_quantity NUMERIC,
  total_remaining_quantity NUMERIC,
  total_waste_quantity NUMERIC,
  total_sold_quantity NUMERIC,
  total_gross_sales NUMERIC,
  total_calculated_sales NUMERIC,
  fruit_name VARCHAR,
  initial_quantity NUMERIC,
  remaining_quantity NUMERIC,
  waste_quantity NUMERIC,
  sold_quantity NUMERIC,
  price_per_kg NUMERIC,
  start_price_per_kg NUMERIC,
  end_price_per_kg NUMERIC,
  gross_sales NUMERIC,
  net_sales NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH start_report AS (
    SELECT r.*, u.name || ' ' || u.surname AS user_name
    FROM reports r
    JOIN users u ON r.user_id = u.id
    WHERE r.place_id = p_place_id AND r.report_date = p_report_date AND r.report_type = 'start'
  ),
  end_report AS (
    SELECT r.*, u.name || ' ' || u.surname AS user_name
    FROM reports r
    JOIN users u ON r.user_id = u.id
    WHERE r.place_id = p_place_id AND r.report_date = p_report_date AND r.report_type = 'end'
  ),
  start_fruits AS (
    SELECT rf.*, f.name AS fruit_name
    FROM start_report sr
    JOIN report_fruits rf ON sr.id = rf.report_id
    JOIN fruits f ON rf.fruit_id = f.id
  ),
  end_fruits AS (
    SELECT rf.*, f.name AS fruit_name
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
      SUM(initial_quantity) AS total_initial_quantity,
      SUM(remaining_quantity) AS total_remaining_quantity,
      SUM(waste_quantity) AS total_waste_quantity,
      SUM(sold_quantity) AS total_sold_quantity,
      SUM(gross_sales) AS total_gross_sales,
      SUM(sold_quantity * price_per_kg) AS total_calculated_sales
    FROM combined_fruits
  )
  SELECT 
    p.name AS place_name,
    p_report_date AS report_date,
    CASE WHEN EXISTS (SELECT 1 FROM start_report) THEN TRUE ELSE FALSE END AS has_start_report,
    CASE WHEN EXISTS (SELECT 1 FROM end_report) THEN TRUE ELSE FALSE END AS has_end_report,
    (SELECT id FROM start_report LIMIT 1) AS start_report_id,
    (SELECT id FROM end_report LIMIT 1) AS end_report_id,
    (SELECT user_name FROM start_report LIMIT 1) AS start_user_name,
    (SELECT user_name FROM end_report LIMIT 1) AS end_user_name,
    COALESCE((SELECT work_hours FROM start_report LIMIT 1), 0) AS start_work_hours,
    COALESCE((SELECT work_hours FROM end_report LIMIT 1), 0) AS end_work_hours,
    COALESCE((SELECT initial_cash FROM start_report LIMIT 1), 0) AS initial_cash,
    COALESCE((SELECT deposited_cash FROM end_report LIMIT 1), 0) AS deposited_cash,
    COALESCE((SELECT terminal_shipment_report FROM start_report LIMIT 1), '') AS start_terminal_report,
    COALESCE((SELECT terminal_shipment_report FROM end_report LIMIT 1), '') AS end_terminal_report,
    COALESCE((SELECT total_initial_quantity FROM totals), 0) AS total_initial_quantity,
    COALESCE((SELECT total_remaining_quantity FROM totals), 0) AS total_remaining_quantity,
    COALESCE((SELECT total_waste_quantity FROM totals), 0) AS total_waste_quantity,
    COALESCE((SELECT total_sold_quantity FROM totals), 0) AS total_sold_quantity,
    COALESCE((SELECT total_gross_sales FROM totals), 0) AS total_gross_sales,
    COALESCE((SELECT total_calculated_sales FROM totals), 0) AS total_calculated_sales,
    cf.fruit_name,
    cf.initial_quantity,
    cf.remaining_quantity,
    cf.waste_quantity,
    cf.sold_quantity,
    cf.price_per_kg,
    cf.start_price_per_kg,
    cf.end_price_per_kg,
    cf.gross_sales,
    cf.net_sales
  FROM places p
  CROSS JOIN combined_fruits cf
  WHERE p.id = p_place_id;
END;
$$ LANGUAGE plpgsql; 