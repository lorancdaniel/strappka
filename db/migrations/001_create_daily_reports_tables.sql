-- Tworzenie sekwencji dla tabel raportów dziennych
CREATE SEQUENCE IF NOT EXISTS daily_reports_id_seq;
CREATE SEQUENCE IF NOT EXISTS daily_report_fruits_id_seq;

-- Tabela: public.daily_reports
CREATE TABLE IF NOT EXISTS public.daily_reports
(
    id integer NOT NULL DEFAULT nextval('daily_reports_id_seq'::regclass),
    place_id integer NOT NULL,
    report_date date NOT NULL,
    start_user_id integer,
    end_user_id integer,
    start_user_name text,
    end_user_name text,
    work_hours numeric(4,2) NOT NULL,
    start_cash numeric(10,2) NOT NULL,
    end_cash numeric(10,2) NOT NULL,
    card_payments numeric(10,2) NOT NULL,
    online_payments numeric(10,2) NOT NULL DEFAULT 0,
    total_sales numeric(10,2) NOT NULL,
    total_sold_quantity numeric(10,2) NOT NULL,
    total_waste_quantity numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT daily_reports_pkey PRIMARY KEY (id),
    CONSTRAINT daily_reports_place_date_key UNIQUE (place_id, report_date),
    CONSTRAINT daily_reports_place_id_fkey FOREIGN KEY (place_id)
        REFERENCES public.places (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT daily_reports_start_user_id_fkey FOREIGN KEY (start_user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT daily_reports_end_user_id_fkey FOREIGN KEY (end_user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL,
    CONSTRAINT daily_reports_work_hours_check CHECK (work_hours >= 0::numeric AND work_hours <= 24::numeric),
    CONSTRAINT daily_reports_start_cash_check CHECK (start_cash >= 0::numeric),
    CONSTRAINT daily_reports_end_cash_check CHECK (end_cash >= 0::numeric),
    CONSTRAINT daily_reports_card_payments_check CHECK (card_payments >= 0::numeric),
    CONSTRAINT daily_reports_online_payments_check CHECK (online_payments >= 0::numeric),
    CONSTRAINT daily_reports_total_sales_check CHECK (total_sales >= 0::numeric),
    CONSTRAINT daily_reports_total_sold_quantity_check CHECK (total_sold_quantity >= 0::numeric),
    CONSTRAINT daily_reports_total_waste_quantity_check CHECK (total_waste_quantity >= 0::numeric)
);

-- Tabela: public.daily_report_fruits
CREATE TABLE IF NOT EXISTS public.daily_report_fruits
(
    id integer NOT NULL DEFAULT nextval('daily_report_fruits_id_seq'::regclass),
    daily_report_id integer NOT NULL,
    fruit_id integer,
    fruit_name character varying(50) NOT NULL,
    initial_quantity numeric(10,2) NOT NULL,
    remaining_quantity numeric(10,2) NOT NULL,
    waste_quantity numeric(10,2) NOT NULL,
    sold_quantity numeric(10,2) NOT NULL,
    price_per_kg numeric(10,2) NOT NULL,
    start_price_per_kg numeric(10,2) NOT NULL,
    end_price_per_kg numeric(10,2) NOT NULL,
    gross_sales numeric(10,2) NOT NULL,
    calculated_sales numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT daily_report_fruits_pkey PRIMARY KEY (id),
    CONSTRAINT daily_report_fruits_daily_report_id_fkey FOREIGN KEY (daily_report_id)
        REFERENCES public.daily_reports (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT daily_report_fruits_initial_quantity_check CHECK (initial_quantity >= 0::numeric),
    CONSTRAINT daily_report_fruits_remaining_quantity_check CHECK (remaining_quantity >= 0::numeric),
    CONSTRAINT daily_report_fruits_waste_quantity_check CHECK (waste_quantity >= 0::numeric),
    CONSTRAINT daily_report_fruits_sold_quantity_check CHECK (sold_quantity >= 0::numeric),
    CONSTRAINT daily_report_fruits_price_per_kg_check CHECK (price_per_kg >= 0::numeric),
    CONSTRAINT daily_report_fruits_start_price_per_kg_check CHECK (start_price_per_kg >= 0::numeric),
    CONSTRAINT daily_report_fruits_end_price_per_kg_check CHECK (end_price_per_kg >= 0::numeric),
    CONSTRAINT daily_report_fruits_gross_sales_check CHECK (gross_sales >= 0::numeric),
    CONSTRAINT daily_report_fruits_calculated_sales_check CHECK (calculated_sales >= 0::numeric),
    CONSTRAINT daily_report_fruits_quantity_validation CHECK (sold_quantity + remaining_quantity + waste_quantity = initial_quantity)
);

-- Indeksy dla szybszego wyszukiwania
CREATE INDEX IF NOT EXISTS idx_daily_reports_place_id ON daily_reports(place_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_report_date ON daily_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_daily_report_fruits_daily_report_id ON daily_report_fruits(daily_report_id);

-- Funkcja do automatycznego aktualizacji pola updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggery do automatycznej aktualizacji pola updated_at
CREATE TRIGGER update_daily_reports_updated_at
BEFORE UPDATE ON daily_reports
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_report_fruits_updated_at
BEFORE UPDATE ON daily_report_fruits
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Funkcja do generowania raportu dziennego
CREATE OR REPLACE FUNCTION get_daily_report(p_place_id INTEGER, p_report_date DATE)
RETURNS TABLE (
    place_id INTEGER,
    place_name TEXT,
    report_date DATE,
    start_user_id INTEGER,
    end_user_id INTEGER,
    start_user_name TEXT,
    end_user_name TEXT,
    work_hours NUMERIC,
    start_cash NUMERIC,
    end_cash NUMERIC,
    card_payments NUMERIC,
    online_payments NUMERIC,
    total_sales NUMERIC,
    fruits JSONB
) AS $$
DECLARE
    start_report RECORD;
    end_report RECORD;
    start_fruits RECORD;
    end_fruits RECORD;
    fruit_data JSONB := '[]'::JSONB;
    fruit_item JSONB;
    total_sold_qty NUMERIC := 0;
    total_waste_qty NUMERIC := 0;
    calculated_sales NUMERIC := 0;
BEGIN
    -- Pobierz raport początkowy
    SELECT r.*, p.name AS place_name, u.name || ' ' || u.surname AS user_name
    INTO start_report
    FROM reports r
    JOIN places p ON r.place_id = p.id
    JOIN users u ON u.id = r.user_id
    WHERE r.place_id = p_place_id
      AND r.report_date = p_report_date
      AND r.report_type = 'start';
      
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Pobierz raport końcowy
    SELECT r.*, u.name || ' ' || u.surname AS user_name
    INTO end_report
    FROM reports r
    JOIN users u ON u.id = r.user_id
    WHERE r.place_id = p_place_id
      AND r.report_date = p_report_date
      AND r.report_type = 'end';
      
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Przetwórz dane owoców
    FOR start_fruits IN (
        SELECT * FROM report_fruits WHERE report_id = start_report.id
    ) LOOP
        -- Znajdź odpowiadający owoc w raporcie końcowym
        SELECT * INTO end_fruits
        FROM report_fruits
        WHERE report_id = end_report.id
          AND fruit_type = start_fruits.fruit_type;
          
        IF FOUND THEN
            -- Oblicz sprzedaną ilość i przychód
            DECLARE
                sold_qty NUMERIC := start_fruits.initial_quantity - COALESCE(end_fruits.remaining_quantity, 0) - COALESCE(end_fruits.waste_quantity, 0);
                avg_price NUMERIC := (start_fruits.price_per_kg + end_fruits.price_per_kg) / 2;
                calc_sales NUMERIC := sold_qty * avg_price;
            BEGIN
                -- Aktualizuj sumy
                total_sold_qty := total_sold_qty + sold_qty;
                total_waste_qty := total_waste_qty + COALESCE(end_fruits.waste_quantity, 0);
                calculated_sales := calculated_sales + calc_sales;
                
                -- Dodaj dane owocu do JSON
                fruit_item := jsonb_build_object(
                    'fruit_type', start_fruits.fruit_type,
                    'initial_quantity', start_fruits.initial_quantity,
                    'remaining_quantity', COALESCE(end_fruits.remaining_quantity, 0),
                    'waste_quantity', COALESCE(end_fruits.waste_quantity, 0),
                    'sold_quantity', sold_qty,
                    'start_price_per_kg', start_fruits.price_per_kg,
                    'end_price_per_kg', end_fruits.price_per_kg,
                    'avg_price_per_kg', avg_price,
                    'calculated_sales', calc_sales
                );
                
                fruit_data := fruit_data || fruit_item;
            END;
        END IF;
    END LOOP;
    
    -- Zwróć dane raportu dziennego
    RETURN QUERY SELECT
        start_report.place_id,
        start_report.place_name,
        start_report.report_date,
        start_report.user_id,
        end_report.user_id,
        start_report.user_name,
        end_report.user_name,
        end_report.work_hours,
        start_report.initial_cash,
        end_report.deposited_cash,
        COALESCE((end_report.deposited_cash - start_report.initial_cash), 0),
        0::NUMERIC,
        COALESCE((end_report.deposited_cash - start_report.initial_cash), 0),
        fruit_data;
END;
$$ LANGUAGE plpgsql; 