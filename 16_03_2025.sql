PGDMP      $                }            strappka    17.2    17.1 l    �           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                           false            �           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                           false            �           0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                           false            �           1262    16663    strappka    DATABASE     {   CREATE DATABASE strappka WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'Polish_Poland.1250';
    DROP DATABASE strappka;
                     postgres    false            �            1255    24942 &   check_duplicate_reports(integer, date)    FUNCTION     y  CREATE FUNCTION public.check_duplicate_reports(p_place_id integer, p_date date) RETURNS TABLE(report_type character varying, count integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    report_type,
    COUNT(*) AS count
  FROM reports
  WHERE place_id = p_place_id AND report_date = p_date
  GROUP BY report_type
  HAVING COUNT(*) > 1;
END;
$$;
 O   DROP FUNCTION public.check_duplicate_reports(p_place_id integer, p_date date);
       public               postgres    false            �            1255    24943 +   check_fruit_data_consistency(integer, date)    FUNCTION     X  CREATE FUNCTION public.check_fruit_data_consistency(p_place_id integer, p_date date) RETURNS TABLE(fruit_id integer, fruit_name character varying, start_report_count integer, end_report_count integer, has_inconsistency boolean)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  WITH start_fruits AS (
    SELECT 
      f.id AS fruit_id,
      f.name AS fruit_name,
      COUNT(*) AS count
    FROM reports r
    JOIN report_fruits rf ON r.id = rf.report_id
    JOIN fruits f ON rf.fruit_id = f.id
    WHERE r.place_id = p_place_id AND r.report_date = p_date AND r.report_type = 'start'
    GROUP BY f.id, f.name
  ),
  end_fruits AS (
    SELECT 
      f.id AS fruit_id,
      f.name AS fruit_name,
      COUNT(*) AS count
    FROM reports r
    JOIN report_fruits rf ON r.id = rf.report_id
    JOIN fruits f ON rf.fruit_id = f.id
    WHERE r.place_id = p_place_id AND r.report_date = p_date AND r.report_type = 'end'
    GROUP BY f.id, f.name
  )
  SELECT 
    COALESCE(sf.fruit_id, ef.fruit_id) AS fruit_id,
    COALESCE(sf.fruit_name, ef.fruit_name) AS fruit_name,
    COALESCE(sf.count, 0) AS start_report_count,
    COALESCE(ef.count, 0) AS end_report_count,
    COALESCE(sf.count, 0) <> COALESCE(ef.count, 0) AS has_inconsistency
  FROM start_fruits sf
  FULL OUTER JOIN end_fruits ef ON sf.fruit_id = ef.fruit_id;
END;
$$;
 T   DROP FUNCTION public.check_fruit_data_consistency(p_place_id integer, p_date date);
       public               postgres    false            �            1255    24949 .   debug_daily_report_calculations(integer, date)    FUNCTION       CREATE FUNCTION public.debug_daily_report_calculations(p_place_id integer, p_date date) RETURNS TABLE(place_name character varying, report_date date, fruit_name character varying, start_report_exists boolean, end_report_exists boolean, initial_quantity numeric, remaining_quantity numeric, waste_quantity numeric, calculated_sold_quantity numeric, price_per_kg numeric, calculated_net_sales numeric, terminal_report_value numeric, start_report_id integer, end_report_id integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  WITH start_report AS (
    SELECT 
      r.id,
      r.place_id,
      r.report_date,
      r.report_type,
      true AS exists
    FROM reports r
    WHERE r.place_id = p_place_id AND r.report_date = p_date AND r.report_type = 'start'
    LIMIT 1
  ),
  end_report AS (
    SELECT 
      r.id,
      r.place_id,
      r.report_date,
      r.report_type,
      true AS exists
    FROM reports r
    WHERE r.place_id = p_place_id AND r.report_date = p_date AND r.report_type = 'end'
    LIMIT 1
  ),
  start_fruits AS (
    SELECT 
      f.id AS fruit_id,
      f.name AS fruit_name,
      sf.initial_quantity,
      sf.price_per_kg
    FROM start_report sr
    JOIN report_fruits sf ON sr.id = sf.report_id
    JOIN fruits f ON sf.fruit_id = f.id
  ),
  end_fruits AS (
    SELECT 
      f.id AS fruit_id,
      f.name AS fruit_name,
      ef.remaining_quantity,
      ef.waste_quantity,
      ef.gross_sales
    FROM end_report er
    JOIN report_fruits ef ON er.id = ef.report_id
    JOIN fruits f ON ef.fruit_id = f.id
  ),
  combined_fruits AS (
    SELECT 
      COALESCE(sf.fruit_id, ef.fruit_id) AS fruit_id,
      COALESCE(sf.fruit_name, ef.fruit_name) AS fruit_name,
      sf.initial_quantity,
      ef.remaining_quantity,
      ef.waste_quantity,
      GREATEST(0, COALESCE(sf.initial_quantity, 0) - COALESCE(ef.remaining_quantity, 0) - COALESCE(ef.waste_quantity, 0)) AS calculated_sold_quantity,
      sf.price_per_kg,
      -- Poprawione obliczenie przychodu (iloĹ›Ä‡ sprzedanego towaru * cena za jednostkÄ™)
      GREATEST(0, COALESCE(sf.initial_quantity, 0) - COALESCE(ef.remaining_quantity, 0) - COALESCE(ef.waste_quantity, 0)) * COALESCE(sf.price_per_kg, 0) AS calculated_net_sales,
      -- WartoĹ›Ä‡ z terminala (dla caĹ‚ego raportu, nie per produkt)
      ef.gross_sales AS terminal_report_value
    FROM start_fruits sf
    FULL OUTER JOIN end_fruits ef ON sf.fruit_id = ef.fruit_id
  ),
  terminal_report AS (
    SELECT 
      SUM(ef.gross_sales) AS total_terminal_value
    FROM end_report er
    JOIN report_fruits ef ON er.id = ef.report_id
  )
  SELECT 
    p.name AS place_name,
    p_date AS report_date,
    cf.fruit_name,
    EXISTS (SELECT 1 FROM start_report) AS start_report_exists,
    EXISTS (SELECT 1 FROM end_report) AS end_report_exists,
    cf.initial_quantity,
    cf.remaining_quantity,
    cf.waste_quantity,
    cf.calculated_sold_quantity,
    cf.price_per_kg,
    cf.calculated_net_sales,
    (SELECT total_terminal_value FROM terminal_report) AS terminal_report_value,
    (SELECT id FROM start_report LIMIT 1) AS start_report_id,
    (SELECT id FROM end_report LIMIT 1) AS end_report_id
  FROM places p
  CROSS JOIN combined_fruits cf
  WHERE p.id = p_place_id;
END;
$$;
 W   DROP FUNCTION public.debug_daily_report_calculations(p_place_id integer, p_date date);
       public               postgres    false            �            1255    24905    generate_daily_report()    FUNCTION       CREATE FUNCTION public.generate_daily_report() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  daily_report_id INTEGER;
  summary_json JSONB;
BEGIN
  -- SprawdĹş, czy istnieje juĹĽ raport dzienny dla tego miejsca i daty
  SELECT id INTO daily_report_id
  FROM daily_reports
  WHERE place_id = NEW.place_id AND report_date = NEW.report_date;

  -- Pobierz dane z funkcji get_daily_report
  SELECT COALESCE(jsonb_agg(report_data), '[]'::jsonb) INTO summary_json
  FROM get_daily_report(NEW.place_id, NEW.report_date);

  -- JeĹ›li nie ma ĹĽadnych danych, ustaw domyĹ›lnÄ… wartoĹ›Ä‡ jako pusty array JSON
  IF summary_json IS NULL OR summary_json = 'null'::jsonb THEN
    summary_json := '[]'::jsonb;
  END IF;

  IF daily_report_id IS NULL THEN
    -- JeĹ›li nie istnieje, utwĂłrz nowy raport dzienny
    INSERT INTO daily_reports (place_id, report_date, summary_data, created_at)
    VALUES (
      NEW.place_id, 
      NEW.report_date, 
      summary_json,
      NOW()
    );
  ELSE
    -- JeĹ›li istnieje, zaktualizuj istniejÄ…cy raport dzienny
    UPDATE daily_reports
    SET 
      summary_data = summary_json,
      created_at = NOW()
    WHERE id = daily_report_id;
  END IF;

  RETURN NEW;
END;
$$;
 .   DROP FUNCTION public.generate_daily_report();
       public               postgres    false            �            1255    25116    get_daily_report(integer)    FUNCTION     �  CREATE FUNCTION public.get_daily_report(p_id integer) RETURNS TABLE(id integer, place_id integer, place_name text, report_date date, has_start_report boolean, has_end_report boolean, start_report_id integer, end_report_id integer, start_user_name text, end_user_name text, start_work_hours numeric, end_work_hours numeric, initial_cash numeric, deposited_cash numeric, start_terminal_report text, end_terminal_report text, total_initial_quantity numeric, total_remaining_quantity numeric, total_waste_quantity numeric, total_sold_quantity numeric, total_gross_sales numeric, total_calculated_sales numeric, created_at timestamp with time zone, updated_at timestamp with time zone, fruits jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH report_data AS (
        SELECT 
            dr.id,
            dr.place_id,
            p.name AS place_name,
            dr.report_date,
            dr.has_start_report,
            dr.has_end_report,
            dr.start_report_id,
            dr.end_report_id,
            dr.start_user_name,
            dr.end_user_name,
            dr.start_work_hours,
            dr.end_work_hours,
            dr.initial_cash,
            dr.deposited_cash,
            dr.start_terminal_report,
            dr.end_terminal_report,
            dr.total_initial_quantity,
            dr.total_remaining_quantity,
            dr.total_waste_quantity,
            dr.total_sold_quantity,
            dr.total_gross_sales,
            dr.total_calculated_sales,
            dr.created_at,
            dr.updated_at
        FROM daily_reports dr
        JOIN places p ON dr.place_id = p.id
        WHERE dr.id = p_id
    ),
    fruits_data AS (
        SELECT 
            json_agg(
                json_build_object(
                    'id', drf.id,
                    'daily_report_id', drf.daily_report_id,
                    'fruit_id', drf.fruit_id,
                    'fruit_name', drf.fruit_name,
                    'initial_quantity', drf.initial_quantity,
                    'remaining_quantity', drf.remaining_quantity,
                    'waste_quantity', drf.waste_quantity,
                    'sold_quantity', drf.sold_quantity,
                    'price_per_kg', drf.price_per_kg,
                    'start_price_per_kg', drf.start_price_per_kg,
                    'end_price_per_kg', drf.end_price_per_kg,
                    'gross_sales', drf.gross_sales,
                    'calculated_sales', drf.calculated_sales
                )
            ) AS fruits_json
        FROM daily_report_fruits drf
        WHERE drf.daily_report_id = p_id
        GROUP BY drf.daily_report_id
    )
    SELECT 
        rd.id,
        rd.place_id,
        rd.place_name,
        rd.report_date,
        rd.has_start_report,
        rd.has_end_report,
        rd.start_report_id,
        rd.end_report_id,
        rd.start_user_name,
        rd.end_user_name,
        rd.start_work_hours,
        rd.end_work_hours,
        rd.initial_cash,
        rd.deposited_cash,
        rd.start_terminal_report,
        rd.end_terminal_report,
        rd.total_initial_quantity,
        rd.total_remaining_quantity,
        rd.total_waste_quantity,
        rd.total_sold_quantity,
        rd.total_gross_sales,
        rd.total_calculated_sales,
        rd.created_at,
        rd.updated_at,
        COALESCE(fd.fruits_json, '[]'::jsonb) AS fruits
    FROM report_data rd
    LEFT JOIN fruits_data fd ON TRUE;
END;
$$;
 5   DROP FUNCTION public.get_daily_report(p_id integer);
       public               postgres    false            �            1255    25121    get_daily_report(integer, date)    FUNCTION     �  CREATE FUNCTION public.get_daily_report(p_place_id integer, p_report_date date) RETURNS TABLE(report_data json)
    LANGUAGE plpgsql
    AS $$
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
$$;
 O   DROP FUNCTION public.get_daily_report(p_place_id integer, p_report_date date);
       public               postgres    false            �            1255    25117 D   get_daily_reports(date, date, integer, integer, integer, text, text)    FUNCTION     �  CREATE FUNCTION public.get_daily_reports(p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_place_id integer DEFAULT NULL::integer, p_page integer DEFAULT 1, p_page_size integer DEFAULT 10, p_sort_field text DEFAULT 'report_date'::text, p_sort_direction text DEFAULT 'DESC'::text) RETURNS TABLE(id integer, place_id integer, place_name text, report_date date, has_start_report boolean, has_end_report boolean, start_user_name text, end_user_name text, start_work_hours numeric, end_work_hours numeric, initial_cash numeric, deposited_cash numeric, total_initial_quantity numeric, total_remaining_quantity numeric, total_waste_quantity numeric, total_sold_quantity numeric, total_gross_sales numeric, total_calculated_sales numeric, created_at timestamp with time zone, total_count bigint)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_offset INTEGER := (p_page - 1) * p_page_size;
    v_sort_field TEXT := CASE 
        WHEN p_sort_field IN ('id', 'place_id', 'place_name', 'report_date', 'start_user_name', 'end_user_name', 
                             'start_work_hours', 'end_work_hours', 'initial_cash', 'deposited_cash', 
                             'total_initial_quantity', 'total_remaining_quantity', 'total_waste_quantity', 
                             'total_sold_quantity', 'total_gross_sales', 'total_calculated_sales', 'created_at')
        THEN p_sort_field
        ELSE 'report_date'
    END;
    v_sort_direction TEXT := CASE 
        WHEN UPPER(p_sort_direction) IN ('ASC', 'DESC') 
        THEN UPPER(p_sort_direction)
        ELSE 'DESC'
    END;
    v_sql TEXT;
    v_count_sql TEXT;
    v_where_clause TEXT := 'WHERE 1=1';
    v_total_count BIGINT;
BEGIN
    -- Budowanie klauzuli WHERE
    IF p_start_date IS NOT NULL THEN
        v_where_clause := v_where_clause || ' AND dr.report_date >= ' || quote_literal(p_start_date);
    END IF;
    
    IF p_end_date IS NOT NULL THEN
        v_where_clause := v_where_clause || ' AND dr.report_date <= ' || quote_literal(p_end_date);
    END IF;
    
    IF p_place_id IS NOT NULL THEN
        v_where_clause := v_where_clause || ' AND dr.place_id = ' || p_place_id;
    END IF;
    
    -- Zapytanie zliczające całkowitą liczbę rekordów
    v_count_sql := 'SELECT COUNT(*) FROM daily_reports dr ' || v_where_clause;
    EXECUTE v_count_sql INTO v_total_count;
    
    -- Główne zapytanie
    v_sql := 'SELECT 
        dr.id,
        dr.place_id,
        p.name AS place_name,
        dr.report_date,
        dr.has_start_report,
        dr.has_end_report,
        dr.start_user_name,
        dr.end_user_name,
        dr.start_work_hours,
        dr.end_work_hours,
        dr.initial_cash,
        dr.deposited_cash,
        dr.total_initial_quantity,
        dr.total_remaining_quantity,
        dr.total_waste_quantity,
        dr.total_sold_quantity,
        dr.total_gross_sales,
        dr.total_calculated_sales,
        dr.created_at,
        ' || v_total_count || ' AS total_count
    FROM daily_reports dr
    JOIN places p ON dr.place_id = p.id
    ' || v_where_clause || '
    ORDER BY ' || v_sort_field || ' ' || v_sort_direction || '
    LIMIT ' || p_page_size || ' OFFSET ' || v_offset;
    
    RETURN QUERY EXECUTE v_sql;
END;
$$;
 �   DROP FUNCTION public.get_daily_reports(p_start_date date, p_end_date date, p_place_id integer, p_page integer, p_page_size integer, p_sort_field text, p_sort_direction text);
       public               postgres    false            �            1255    24868    log_report_changes()    FUNCTION     �  CREATE FUNCTION public.log_report_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO user_logs (user_id, action, details)
  VALUES (
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.user_id
      ELSE NEW.user_id
    END,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'report_created'
      WHEN TG_OP = 'UPDATE' THEN 'report_updated'
      WHEN TG_OP = 'DELETE' THEN 'report_deleted'
    END,
    jsonb_build_object(
      'report_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
      'place_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.place_id ELSE NEW.place_id END,
      'report_date', CASE WHEN TG_OP = 'DELETE' THEN OLD.report_date ELSE NEW.report_date END,
      'report_type', CASE WHEN TG_OP = 'DELETE' THEN OLD.report_type ELSE NEW.report_type END
    )::text
  );
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
 +   DROP FUNCTION public.log_report_changes();
       public               postgres    false            �            1255    24957    regenerate_all_daily_reports()    FUNCTION     ^  CREATE FUNCTION public.regenerate_all_daily_reports() RETURNS TABLE(report_id integer, place_id_result integer, report_date_result date, status text)
    LANGUAGE plpgsql
    AS $$
DECLARE
  report_rec RECORD;
BEGIN
  FOR report_rec IN 
    SELECT id, place_id, report_date
    FROM daily_reports
    ORDER BY report_date DESC
  LOOP
    BEGIN
      -- Aktualizuj raport dzienny
      UPDATE daily_reports
      SET 
        summary_data = (
          SELECT jsonb_agg(row_to_json(r))
          FROM get_daily_report(report_rec.place_id, report_rec.report_date) r
        ),
        created_at = NOW()
      WHERE id = report_rec.id;
      
      report_id := report_rec.id;
      place_id_result := report_rec.place_id;
      report_date_result := report_rec.report_date;
      status := 'success';
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      report_id := report_rec.id;
      place_id_result := report_rec.place_id;
      report_date_result := report_rec.report_date;
      status := 'error: ' || SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
  
  RETURN;
END;
$$;
 5   DROP FUNCTION public.regenerate_all_daily_reports();
       public               postgres    false            �            1255    24866 #   update_inventory_after_end_report()    FUNCTION     �  CREATE FUNCTION public.update_inventory_after_end_report() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;
 :   DROP FUNCTION public.update_inventory_after_end_report();
       public               postgres    false            �            1259    24872    daily_reports    TABLE       CREATE TABLE public.daily_reports (
    id integer NOT NULL,
    place_id integer NOT NULL,
    report_date date NOT NULL,
    start_report_id integer,
    end_report_id integer,
    summary_data jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
 !   DROP TABLE public.daily_reports;
       public         heap r       postgres    false            �            1259    24871    daily_reports_id_seq    SEQUENCE     �   CREATE SEQUENCE public.daily_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 +   DROP SEQUENCE public.daily_reports_id_seq;
       public               postgres    false    234            �           0    0    daily_reports_id_seq    SEQUENCE OWNED BY     M   ALTER SEQUENCE public.daily_reports_id_seq OWNED BY public.daily_reports.id;
          public               postgres    false    233            �            1259    24727    fruits    TABLE     �   CREATE TABLE public.fruits (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
    DROP TABLE public.fruits;
       public         heap r       postgres    false            �            1259    24726    fruits_id_seq    SEQUENCE     �   CREATE SEQUENCE public.fruits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 $   DROP SEQUENCE public.fruits_id_seq;
       public               postgres    false    218            �           0    0    fruits_id_seq    SEQUENCE OWNED BY     ?   ALTER SEQUENCE public.fruits_id_seq OWNED BY public.fruits.id;
          public               postgres    false    217            �            1259    24738 	   inventory    TABLE     �   CREATE TABLE public.inventory (
    id integer NOT NULL,
    place_id integer NOT NULL,
    fruit_id integer NOT NULL,
    quantity numeric(10,2) DEFAULT 0,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
    DROP TABLE public.inventory;
       public         heap r       postgres    false            �            1259    24737    inventory_id_seq    SEQUENCE     �   CREATE SEQUENCE public.inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 '   DROP SEQUENCE public.inventory_id_seq;
       public               postgres    false    220            �           0    0    inventory_id_seq    SEQUENCE OWNED BY     E   ALTER SEQUENCE public.inventory_id_seq OWNED BY public.inventory.id;
          public               postgres    false    219            �            1259    24769    places    TABLE       CREATE TABLE public.places (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    address character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
    DROP TABLE public.places;
       public         heap r       postgres    false            �            1259    24768    places_id_seq    SEQUENCE     �   CREATE SEQUENCE public.places_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 $   DROP SEQUENCE public.places_id_seq;
       public               postgres    false    226            �           0    0    places_id_seq    SEQUENCE OWNED BY     ?   ALTER SEQUENCE public.places_id_seq OWNED BY public.places.id;
          public               postgres    false    225            �            1259    24804    report_fruits    TABLE     �  CREATE TABLE public.report_fruits (
    id integer NOT NULL,
    report_id integer NOT NULL,
    fruit_id integer NOT NULL,
    initial_quantity numeric(10,2) NOT NULL,
    price_per_kg numeric(10,2) NOT NULL,
    remaining_quantity numeric(10,2),
    waste_quantity numeric(10,2),
    gross_sales numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
 !   DROP TABLE public.report_fruits;
       public         heap r       postgres    false            �            1259    24803    report_fruits_id_seq    SEQUENCE     �   CREATE SEQUENCE public.report_fruits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 +   DROP SEQUENCE public.report_fruits_id_seq;
       public               postgres    false    232            �           0    0    report_fruits_id_seq    SEQUENCE OWNED BY     M   ALTER SEQUENCE public.report_fruits_id_seq OWNED BY public.report_fruits.id;
          public               postgres    false    231            �            1259    24792    reports    TABLE     �  CREATE TABLE public.reports (
    id integer NOT NULL,
    place_id integer NOT NULL,
    user_id integer NOT NULL,
    report_date date NOT NULL,
    report_type character varying(10) NOT NULL,
    terminal_shipment_report character varying(255) NOT NULL,
    work_hours numeric(5,2) NOT NULL,
    initial_cash numeric(10,2),
    cash_for_change numeric(10,2),
    deposited_cash numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reports_report_type_check CHECK (((report_type)::text = ANY ((ARRAY['start'::character varying, 'end'::character varying])::text[])))
);
    DROP TABLE public.reports;
       public         heap r       postgres    false            �            1259    24791    reports_id_seq    SEQUENCE     �   CREATE SEQUENCE public.reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 %   DROP SEQUENCE public.reports_id_seq;
       public               postgres    false    230            �           0    0    reports_id_seq    SEQUENCE OWNED BY     A   ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;
          public               postgres    false    229            �            1259    24759 	   user_logs    TABLE     �   CREATE TABLE public.user_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    action character varying(50) NOT NULL,
    details text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
    DROP TABLE public.user_logs;
       public         heap r       postgres    false            �            1259    24758    user_logs_id_seq    SEQUENCE     �   CREATE SEQUENCE public.user_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 '   DROP SEQUENCE public.user_logs_id_seq;
       public               postgres    false    224            �           0    0    user_logs_id_seq    SEQUENCE OWNED BY     E   ALTER SEQUENCE public.user_logs_id_seq OWNED BY public.user_logs.id;
          public               postgres    false    223            �            1259    24749    user_places    TABLE     �   CREATE TABLE public.user_places (
    id integer NOT NULL,
    user_id integer NOT NULL,
    place_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
    DROP TABLE public.user_places;
       public         heap r       postgres    false            �            1259    24748    user_places_id_seq    SEQUENCE     �   CREATE SEQUENCE public.user_places_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 )   DROP SEQUENCE public.user_places_id_seq;
       public               postgres    false    222            �           0    0    user_places_id_seq    SEQUENCE OWNED BY     I   ALTER SEQUENCE public.user_places_id_seq OWNED BY public.user_places.id;
          public               postgres    false    221            �            1259    24778    users    TABLE     �  CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    surname character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    type_of_user integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    phone bigint
);
    DROP TABLE public.users;
       public         heap r       postgres    false            �            1259    24777    users_id_seq    SEQUENCE     �   CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 #   DROP SEQUENCE public.users_id_seq;
       public               postgres    false    228            �           0    0    users_id_seq    SEQUENCE OWNED BY     =   ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
          public               postgres    false    227            �           2604    24875    daily_reports id    DEFAULT     t   ALTER TABLE ONLY public.daily_reports ALTER COLUMN id SET DEFAULT nextval('public.daily_reports_id_seq'::regclass);
 ?   ALTER TABLE public.daily_reports ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    233    234    234            �           2604    24730 	   fruits id    DEFAULT     f   ALTER TABLE ONLY public.fruits ALTER COLUMN id SET DEFAULT nextval('public.fruits_id_seq'::regclass);
 8   ALTER TABLE public.fruits ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    217    218    218            �           2604    24741    inventory id    DEFAULT     l   ALTER TABLE ONLY public.inventory ALTER COLUMN id SET DEFAULT nextval('public.inventory_id_seq'::regclass);
 ;   ALTER TABLE public.inventory ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    220    219    220            �           2604    24772 	   places id    DEFAULT     f   ALTER TABLE ONLY public.places ALTER COLUMN id SET DEFAULT nextval('public.places_id_seq'::regclass);
 8   ALTER TABLE public.places ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    225    226    226            �           2604    24807    report_fruits id    DEFAULT     t   ALTER TABLE ONLY public.report_fruits ALTER COLUMN id SET DEFAULT nextval('public.report_fruits_id_seq'::regclass);
 ?   ALTER TABLE public.report_fruits ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    232    231    232            �           2604    24795 
   reports id    DEFAULT     h   ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);
 9   ALTER TABLE public.reports ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    229    230    230            �           2604    24762    user_logs id    DEFAULT     l   ALTER TABLE ONLY public.user_logs ALTER COLUMN id SET DEFAULT nextval('public.user_logs_id_seq'::regclass);
 ;   ALTER TABLE public.user_logs ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    224    223    224            �           2604    24752    user_places id    DEFAULT     p   ALTER TABLE ONLY public.user_places ALTER COLUMN id SET DEFAULT nextval('public.user_places_id_seq'::regclass);
 =   ALTER TABLE public.user_places ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    221    222    222            �           2604    24781    users id    DEFAULT     d   ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
 7   ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
       public               postgres    false    227    228    228            }          0    24872    daily_reports 
   TABLE DATA           |   COPY public.daily_reports (id, place_id, report_date, start_report_id, end_report_id, summary_data, created_at) FROM stdin;
    public               postgres    false    234   J�       m          0    24727    fruits 
   TABLE DATA           B   COPY public.fruits (id, name, created_at, updated_at) FROM stdin;
    public               postgres    false    218   ��       o          0    24738 	   inventory 
   TABLE DATA           S   COPY public.inventory (id, place_id, fruit_id, quantity, last_updated) FROM stdin;
    public               postgres    false    220   u�       u          0    24769    places 
   TABLE DATA           K   COPY public.places (id, name, address, created_at, updated_at) FROM stdin;
    public               postgres    false    226   ��       {          0    24804    report_fruits 
   TABLE DATA           �   COPY public.report_fruits (id, report_id, fruit_id, initial_quantity, price_per_kg, remaining_quantity, waste_quantity, gross_sales, created_at, updated_at) FROM stdin;
    public               postgres    false    232   ��       y          0    24792    reports 
   TABLE DATA           �   COPY public.reports (id, place_id, user_id, report_date, report_type, terminal_shipment_report, work_hours, initial_cash, cash_for_change, deposited_cash, created_at, updated_at) FROM stdin;
    public               postgres    false    230   �       s          0    24759 	   user_logs 
   TABLE DATA           M   COPY public.user_logs (id, user_id, action, details, created_at) FROM stdin;
    public               postgres    false    224   ��       q          0    24749    user_places 
   TABLE DATA           H   COPY public.user_places (id, user_id, place_id, created_at) FROM stdin;
    public               postgres    false    222   ��       w          0    24778    users 
   TABLE DATA           p   COPY public.users (id, name, surname, email, password, type_of_user, created_at, updated_at, phone) FROM stdin;
    public               postgres    false    228   *�       �           0    0    daily_reports_id_seq    SEQUENCE SET     C   SELECT pg_catalog.setval('public.daily_reports_id_seq', 31, true);
          public               postgres    false    233            �           0    0    fruits_id_seq    SEQUENCE SET     ;   SELECT pg_catalog.setval('public.fruits_id_seq', 8, true);
          public               postgres    false    217            �           0    0    inventory_id_seq    SEQUENCE SET     ?   SELECT pg_catalog.setval('public.inventory_id_seq', 10, true);
          public               postgres    false    219            �           0    0    places_id_seq    SEQUENCE SET     ;   SELECT pg_catalog.setval('public.places_id_seq', 2, true);
          public               postgres    false    225            �           0    0    report_fruits_id_seq    SEQUENCE SET     C   SELECT pg_catalog.setval('public.report_fruits_id_seq', 23, true);
          public               postgres    false    231            �           0    0    reports_id_seq    SEQUENCE SET     =   SELECT pg_catalog.setval('public.reports_id_seq', 43, true);
          public               postgres    false    229            �           0    0    user_logs_id_seq    SEQUENCE SET     @   SELECT pg_catalog.setval('public.user_logs_id_seq', 128, true);
          public               postgres    false    223            �           0    0    user_places_id_seq    SEQUENCE SET     A   SELECT pg_catalog.setval('public.user_places_id_seq', 10, true);
          public               postgres    false    221            �           0    0    users_id_seq    SEQUENCE SET     :   SELECT pg_catalog.setval('public.users_id_seq', 4, true);
          public               postgres    false    227            �           2606    24880     daily_reports daily_reports_pkey 
   CONSTRAINT     ^   ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_pkey PRIMARY KEY (id);
 J   ALTER TABLE ONLY public.daily_reports DROP CONSTRAINT daily_reports_pkey;
       public                 postgres    false    234            �           2606    24882 4   daily_reports daily_reports_place_id_report_date_key 
   CONSTRAINT     �   ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_place_id_report_date_key UNIQUE (place_id, report_date);
 ^   ALTER TABLE ONLY public.daily_reports DROP CONSTRAINT daily_reports_place_id_report_date_key;
       public                 postgres    false    234    234            �           2606    24736    fruits fruits_name_key 
   CONSTRAINT     Q   ALTER TABLE ONLY public.fruits
    ADD CONSTRAINT fruits_name_key UNIQUE (name);
 @   ALTER TABLE ONLY public.fruits DROP CONSTRAINT fruits_name_key;
       public                 postgres    false    218            �           2606    24734    fruits fruits_pkey 
   CONSTRAINT     P   ALTER TABLE ONLY public.fruits
    ADD CONSTRAINT fruits_pkey PRIMARY KEY (id);
 <   ALTER TABLE ONLY public.fruits DROP CONSTRAINT fruits_pkey;
       public                 postgres    false    218            �           2606    24745    inventory inventory_pkey 
   CONSTRAINT     V   ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);
 B   ALTER TABLE ONLY public.inventory DROP CONSTRAINT inventory_pkey;
       public                 postgres    false    220            �           2606    24747 )   inventory inventory_place_id_fruit_id_key 
   CONSTRAINT     r   ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_place_id_fruit_id_key UNIQUE (place_id, fruit_id);
 S   ALTER TABLE ONLY public.inventory DROP CONSTRAINT inventory_place_id_fruit_id_key;
       public                 postgres    false    220    220            �           2606    24776    places places_pkey 
   CONSTRAINT     P   ALTER TABLE ONLY public.places
    ADD CONSTRAINT places_pkey PRIMARY KEY (id);
 <   ALTER TABLE ONLY public.places DROP CONSTRAINT places_pkey;
       public                 postgres    false    226            �           2606    24811     report_fruits report_fruits_pkey 
   CONSTRAINT     ^   ALTER TABLE ONLY public.report_fruits
    ADD CONSTRAINT report_fruits_pkey PRIMARY KEY (id);
 J   ALTER TABLE ONLY public.report_fruits DROP CONSTRAINT report_fruits_pkey;
       public                 postgres    false    232            �           2606    24813 2   report_fruits report_fruits_report_id_fruit_id_key 
   CONSTRAINT     |   ALTER TABLE ONLY public.report_fruits
    ADD CONSTRAINT report_fruits_report_id_fruit_id_key UNIQUE (report_id, fruit_id);
 \   ALTER TABLE ONLY public.report_fruits DROP CONSTRAINT report_fruits_report_id_fruit_id_key;
       public                 postgres    false    232    232            �           2606    24800    reports reports_pkey 
   CONSTRAINT     R   ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);
 >   ALTER TABLE ONLY public.reports DROP CONSTRAINT reports_pkey;
       public                 postgres    false    230            �           2606    24802 4   reports reports_place_id_report_date_report_type_key 
   CONSTRAINT     �   ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_place_id_report_date_report_type_key UNIQUE (place_id, report_date, report_type);
 ^   ALTER TABLE ONLY public.reports DROP CONSTRAINT reports_place_id_report_date_report_type_key;
       public                 postgres    false    230    230    230            �           2606    24767    user_logs user_logs_pkey 
   CONSTRAINT     V   ALTER TABLE ONLY public.user_logs
    ADD CONSTRAINT user_logs_pkey PRIMARY KEY (id);
 B   ALTER TABLE ONLY public.user_logs DROP CONSTRAINT user_logs_pkey;
       public                 postgres    false    224            �           2606    24755    user_places user_places_pkey 
   CONSTRAINT     Z   ALTER TABLE ONLY public.user_places
    ADD CONSTRAINT user_places_pkey PRIMARY KEY (id);
 F   ALTER TABLE ONLY public.user_places DROP CONSTRAINT user_places_pkey;
       public                 postgres    false    222            �           2606    24757 ,   user_places user_places_user_id_place_id_key 
   CONSTRAINT     t   ALTER TABLE ONLY public.user_places
    ADD CONSTRAINT user_places_user_id_place_id_key UNIQUE (user_id, place_id);
 V   ALTER TABLE ONLY public.user_places DROP CONSTRAINT user_places_user_id_place_id_key;
       public                 postgres    false    222    222            �           2606    24790    users users_email_key 
   CONSTRAINT     Q   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);
 ?   ALTER TABLE ONLY public.users DROP CONSTRAINT users_email_key;
       public                 postgres    false    228            �           2606    24788    users users_pkey 
   CONSTRAINT     N   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
 :   ALTER TABLE ONLY public.users DROP CONSTRAINT users_pkey;
       public                 postgres    false    228            �           1259    24898    idx_daily_reports_place_date    INDEX     g   CREATE INDEX idx_daily_reports_place_date ON public.daily_reports USING btree (place_id, report_date);
 0   DROP INDEX public.idx_daily_reports_place_date;
       public                 postgres    false    234    234            �           1259    24861    idx_inventory_place_id    INDEX     P   CREATE INDEX idx_inventory_place_id ON public.inventory USING btree (place_id);
 *   DROP INDEX public.idx_inventory_place_id;
       public                 postgres    false    220            �           1259    24860    idx_report_fruits_report_id    INDEX     Z   CREATE INDEX idx_report_fruits_report_id ON public.report_fruits USING btree (report_id);
 /   DROP INDEX public.idx_report_fruits_report_id;
       public                 postgres    false    232            �           1259    24859    idx_reports_place_date    INDEX     [   CREATE INDEX idx_reports_place_date ON public.reports USING btree (place_id, report_date);
 *   DROP INDEX public.idx_reports_place_date;
       public                 postgres    false    230    230            �           1259    24865    idx_user_logs_created_at    INDEX     T   CREATE INDEX idx_user_logs_created_at ON public.user_logs USING btree (created_at);
 ,   DROP INDEX public.idx_user_logs_created_at;
       public                 postgres    false    224            �           1259    24864    idx_user_logs_user_id    INDEX     N   CREATE INDEX idx_user_logs_user_id ON public.user_logs USING btree (user_id);
 )   DROP INDEX public.idx_user_logs_user_id;
       public                 postgres    false    224            �           1259    24863    idx_user_places_place_id    INDEX     T   CREATE INDEX idx_user_places_place_id ON public.user_places USING btree (place_id);
 ,   DROP INDEX public.idx_user_places_place_id;
       public                 postgres    false    222            �           1259    24862    idx_user_places_user_id    INDEX     R   CREATE INDEX idx_user_places_user_id ON public.user_places USING btree (user_id);
 +   DROP INDEX public.idx_user_places_user_id;
       public                 postgres    false    222            �           2620    24908 "   reports log_report_changes_trigger    TRIGGER     �   CREATE TRIGGER log_report_changes_trigger AFTER INSERT OR DELETE OR UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.log_report_changes();
 ;   DROP TRIGGER log_report_changes_trigger ON public.reports;
       public               postgres    false    247    230            �           2620    24954 #   reports report_after_insert_trigger    TRIGGER     �   CREATE TRIGGER report_after_insert_trigger AFTER INSERT ON public.reports FOR EACH ROW EXECUTE FUNCTION public.generate_daily_report();
 <   DROP TRIGGER report_after_insert_trigger ON public.reports;
       public               postgres    false    230    248            �           2620    24955 #   reports report_after_update_trigger    TRIGGER     �   CREATE TRIGGER report_after_update_trigger AFTER UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.generate_daily_report();
 <   DROP TRIGGER report_after_update_trigger ON public.reports;
       public               postgres    false    248    230            �           2620    24867     reports update_inventory_trigger    TRIGGER     �   CREATE TRIGGER update_inventory_trigger AFTER INSERT ON public.reports FOR EACH ROW EXECUTE FUNCTION public.update_inventory_after_end_report();
 9   DROP TRIGGER update_inventory_trigger ON public.reports;
       public               postgres    false    230    246            �           2606    24893 .   daily_reports daily_reports_end_report_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_end_report_id_fkey FOREIGN KEY (end_report_id) REFERENCES public.reports(id) ON DELETE SET NULL;
 X   ALTER TABLE ONLY public.daily_reports DROP CONSTRAINT daily_reports_end_report_id_fkey;
       public               postgres    false    234    4798    230            �           2606    24883 )   daily_reports daily_reports_place_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id) ON DELETE CASCADE;
 S   ALTER TABLE ONLY public.daily_reports DROP CONSTRAINT daily_reports_place_id_fkey;
       public               postgres    false    4791    226    234            �           2606    24888 0   daily_reports daily_reports_start_report_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_start_report_id_fkey FOREIGN KEY (start_report_id) REFERENCES public.reports(id) ON DELETE SET NULL;
 Z   ALTER TABLE ONLY public.daily_reports DROP CONSTRAINT daily_reports_start_report_id_fkey;
       public               postgres    false    4798    234    230            �           2606    24819    inventory fk_inventory_fruit    FK CONSTRAINT     �   ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT fk_inventory_fruit FOREIGN KEY (fruit_id) REFERENCES public.fruits(id) ON DELETE CASCADE;
 F   ALTER TABLE ONLY public.inventory DROP CONSTRAINT fk_inventory_fruit;
       public               postgres    false    220    4774    218            �           2606    24814    inventory fk_inventory_place    FK CONSTRAINT     �   ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT fk_inventory_place FOREIGN KEY (place_id) REFERENCES public.places(id) ON DELETE CASCADE;
 F   ALTER TABLE ONLY public.inventory DROP CONSTRAINT fk_inventory_place;
       public               postgres    false    220    4791    226            �           2606    24854 $   report_fruits fk_report_fruits_fruit    FK CONSTRAINT     �   ALTER TABLE ONLY public.report_fruits
    ADD CONSTRAINT fk_report_fruits_fruit FOREIGN KEY (fruit_id) REFERENCES public.fruits(id) ON DELETE CASCADE;
 N   ALTER TABLE ONLY public.report_fruits DROP CONSTRAINT fk_report_fruits_fruit;
       public               postgres    false    232    4774    218            �           2606    24849 %   report_fruits fk_report_fruits_report    FK CONSTRAINT     �   ALTER TABLE ONLY public.report_fruits
    ADD CONSTRAINT fk_report_fruits_report FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;
 O   ALTER TABLE ONLY public.report_fruits DROP CONSTRAINT fk_report_fruits_report;
       public               postgres    false    232    4798    230            �           2606    24839    reports fk_reports_place    FK CONSTRAINT     �   ALTER TABLE ONLY public.reports
    ADD CONSTRAINT fk_reports_place FOREIGN KEY (place_id) REFERENCES public.places(id) ON DELETE CASCADE;
 B   ALTER TABLE ONLY public.reports DROP CONSTRAINT fk_reports_place;
       public               postgres    false    230    226    4791            �           2606    24844    reports fk_reports_user    FK CONSTRAINT     �   ALTER TABLE ONLY public.reports
    ADD CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
 A   ALTER TABLE ONLY public.reports DROP CONSTRAINT fk_reports_user;
       public               postgres    false    230    228    4795            �           2606    24834    user_logs fk_user_logs_user    FK CONSTRAINT     �   ALTER TABLE ONLY public.user_logs
    ADD CONSTRAINT fk_user_logs_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
 E   ALTER TABLE ONLY public.user_logs DROP CONSTRAINT fk_user_logs_user;
       public               postgres    false    228    4795    224            �           2606    24829     user_places fk_user_places_place    FK CONSTRAINT     �   ALTER TABLE ONLY public.user_places
    ADD CONSTRAINT fk_user_places_place FOREIGN KEY (place_id) REFERENCES public.places(id) ON DELETE CASCADE;
 J   ALTER TABLE ONLY public.user_places DROP CONSTRAINT fk_user_places_place;
       public               postgres    false    4791    226    222            �           2606    24824    user_places fk_user_places_user    FK CONSTRAINT     �   ALTER TABLE ONLY public.user_places
    ADD CONSTRAINT fk_user_places_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
 I   ALTER TABLE ONLY public.user_places DROP CONSTRAINT fk_user_places_user;
       public               postgres    false    222    4795    228            }   �  x��S�N�@=�� ��a�`�U��b������n�l�]BLӃ�9�R�uC;oޛ���{="#�q}��l�����;1��B�:t���Ϧ�gx��	����!
�����SIȨ����5֯+�Ίr�P�,%
�B����Jp)[�N�
�hKE��0��*݅I�gI�Y@����,�*�@	R�.��4O�����)٠��@<_�����j���R�� ��/
r^2�r�����=�}���>��YU�-G�T�|��1�\#J�ƙ>́�D&�!XH��T~����STT}N�!q�4���`�E�y!�-�� �c5��hۂn��B+v�}�A�+����hk(�a9­��;e��?��ǥ��tY\d�{��:N���֜K#Wg�~���L2}N���?3c�0~O(,�      m   t   x���I
�0ϓW���ɦ�[���@��^_�a<7�T����c�k!0h�D+��6�]+�-�	�=�����BS�8�h;�0�.^�~���������W~f?�*!�f�j�      o   c   x�m���@CѳT�4`�Zg�Z��o�+���d�t ���ˬ5:Mn���3�(���\���p��އk����v����>I�_UKO�>g^Uy�G�����      u   �   x�3�.I��/�,��W0T�U8����������]TUY��`��O�L*KN�4202�50�50Q04�2��26�32�012B�22�2��25�330033�2B��h��cԖ���
.(Y�71�34252��#����� �2      {   t   x����AC�I4�Q�|��"����>�hR䃟��D	���]���x��%k��P���,b8�)!�w3��\_Ņ�a���))�__�לi��$H��9â�k_ =MUo8�Bw      y   �   x�}�M� F��)�@��K9�'��D�.�����VCB`�G�ˇX����m@��c>��d��</[LqN�X߇*U�j�I
R�D ��\o�Ʊ���k��*�L�\���V�k!
q��#_Y�����:��5Ѩ��+��CS���6v"�2 <LWO�      s   
  x��[[���~^�
b�7Ĝ�9s�[����%( p%Z��+��D�� ����C��� O)�'k�H~I�PZ�DqyYq� ��k��|s.߹g�l��ɬן��,���|�F����C.������z���3�_1����g�q�p:�&����_�A�B!ŭ��2{:�b�r��@���&�u����G�r�OBh��3u�׏=~�j�gpv�'�,�Fg/��$Z�O��f>��[��lػC�6��].�q��%��]Noo��d��D~6�'Q�/���ųW���P�PB��=����4�,��c@(-4Y@��p��,�����������Ɠ�2���������¿����3�t~}M�@�Ϣ�8M�A��˭���AM�A6��(��I���I��0���0+��J�Vk�����Y'24��0��� ��CQ{)3U��m��EA�&��##/�:<��u˖��UȐ��j �oK��� �:H��<J�UF��G���)���"QR�f�f�U2�gD�K?��(���(8�	��h�Q!�CT��(�9 �jy�h&[d�by{���_9�M��0�,�l0�ILz����Hi<�'2A�Pҧ�>��F��ۂjW�t��X 7ض��OG!l6�,O���~>�	�H{)V�@����A�@�Rx��[#�]ґn�R m�&@n$�'�A!ӡ�@r��<<@�z2�ͮ��!�������+�}/����r�BY4��2���jOQ��	��%�=a����r�K�����*D������*)@H�a ��8��??���N���_2��)��r���)w������qI��cA���AZ�=Y�L��L�r�!P�� �ғ��$������墁E�U�4HIh,gR{R�5)�L�9�M��ƓXgQ|�E�u�&��b��YF-�'u�V���C�"`BsN>5m!t��l@���jk@<M`��i���!k�#�@7ߠ�R���9K=�@��q8�����Z�R�R��!�2���e�	*��&8�-ACE ��y,��}���^76���l%ʼ�Z!-��n��4Őq�%
�:�{��FWA ��t�Y�tB��ƩE&��N���e:έ}��n�vd�E(�D �/��T���v�[�y��U�E=;s���T��S'�n�:��q�
ׅ�zr7����e���t�K��Uv����RGS��t�%�j�dkŤ�TiV�5��E\�d����4�1Ϊ&�D�Ul�d*jo{Q#*ր�)���B
�=UwS#��b%SQ���O�{�����܎-M襟�UV�}s{�	���3`��o?��4	x~�&5u���X	X��Ԧ1��Ȕ���D[-PH��-��W7�%Y/Q���'=�h�S�i���O-�H�Uy��&��j9������!�VSZ)���^�uBb&�A�m��^�7l U~��F�'�r�F�����ow������͆4�P�3mwܢbJoa� U C�����D�-w�bW�^7���b:n�"d,<P`�՞��ʄ��uc��nA������v�����e��ն�7W�AE,�p=+07`K�=�d��\�$R+ � J��R��2��|��g���	��g� �)����|�����&�ҟœ�d��~5J�q!��"0���n�[ߠ���} �L/J����L��i�3��d��e��?�M�}��F�Fprt�"TJ6Шl�{�������/�n�p}����<����� �Z��5��kϲ�����b'�(���#��>��u�9�}�?�F%ֶxl} �����P��������� ������M�?R��4��1�*������:�G���8�~������e1�1��v(�z�d�a�߈o#g��\T�oB������'̜�ˌ����8�Mvc����N�p��5��݈+�m���ƂA��pa�]wBod��&rb����`��{�v�I�~D�.��F�A4�9y�]&�s������"�]�b$���©y�[���3����o�s4��d�x�ro�K$�e�q�&c!���H��ؠ	��D6�y夹骖���Dr��DmT���-15��Y�eӂ��׆���H"(�NY6��ۭ)L��B@����x%�, k2��ʑ�D���Z�H�][W�]�Emi�����F���I׿kK�+����`m�+;�L(���'�������	�UI�ྈh�9���4mg	�����[��r.=R���X��j��Բ�	@Q�N4u_�
��dz���o���0]P�r��Ej����r�H�-����s߽r�ú��F3��X F�'�!���XLRf�)���C���I���2����|o�4��%��u�=I�x��>o�)0�$���~̨W4�3t� �}�-ʭq�����gD�Ȗ�8s�j�H0P.vlT�ao>v9sT�j�H�%�>GJ(���#����Ֆ�� TZU۴v��ҜSZ�-��^��V�Է�ܒUU��f���E���0��nɆ�c�*�k�y������      q   ?   x�Uʹ�0��Pb���Z�v��J��ڈ�\�ę�5�]����1��,��c���P~      w   �   x�}�OO�0���Sx���?��ӈ"&fJD&^�(�P�8��՝���M��y.Aig��_���߳Y�S�d��(�mH �rGw�<���a��)N�Ǉ�aJ����8mk�=�y_�ѹ�}FQ��
�
�a	���_S ��B��NT^;��t��h�'n�-�{&_�~,ӷJ��Μ���0��YƔom�yw�������(����PGה��L��A�9�Ut     