-- Create places table if it doesn't exist
CREATE TABLE IF NOT EXISTS places (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    adress VARCHAR(255) NOT NULL,
    employes JSONB DEFAULT '[]'::jsonb
);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_places_name ON places(name);

-- Tworzenie sekwencji
CREATE SEQUENCE IF NOT EXISTS users_id_seq;
CREATE SEQUENCE IF NOT EXISTS reports_id_seq;
CREATE SEQUENCE IF NOT EXISTS report_fruits_id_seq;

-- Table: public.users

-- DROP TABLE IF EXISTS public.users;

CREATE TABLE IF NOT EXISTS public.users
(
    id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    name text COLLATE pg_catalog."default" NOT NULL,
    surname text COLLATE pg_catalog."default" NOT NULL,
    login text COLLATE pg_catalog."default" NOT NULL,
    password text COLLATE pg_catalog."default" NOT NULL,
    working_hours numeric NOT NULL DEFAULT 0,
    places integer[] NOT NULL DEFAULT '{}'::integer[],
    type_of_user integer NOT NULL DEFAULT 0,
    created timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    logs timestamp without time zone[] NOT NULL DEFAULT '{}'::timestamp without time zone[],
    phone integer,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_login_key UNIQUE (login)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.users
    OWNER to postgres;

-- Table: public.reports

-- DROP TABLE IF EXISTS public.reports;

CREATE TABLE IF NOT EXISTS public.reports
(
    id integer NOT NULL DEFAULT nextval('reports_id_seq'::regclass),
    place_id integer NOT NULL,
    report_date date NOT NULL,
    report_type character varying(7) COLLATE pg_catalog."default" NOT NULL,
    terminal_shipment_report text COLLATE pg_catalog."default" NOT NULL,
    cash_for_change numeric(10,2),
    work_hours numeric(4,2) NOT NULL,
    deposited_cash numeric(10,2),
    initial_cash numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reports_pkey PRIMARY KEY (id),
    CONSTRAINT unique_daily_report UNIQUE (place_id, report_date, report_type),
    CONSTRAINT reports_place_id_fkey FOREIGN KEY (place_id)
        REFERENCES public.places (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT reports_report_type_check CHECK (report_type::text = ANY (ARRAY['start'::character varying, 'end'::character varying]::text[])),
    CONSTRAINT reports_cash_for_change_check CHECK (cash_for_change >= 0::numeric),
    CONSTRAINT reports_work_hours_check CHECK (work_hours >= 0::numeric AND work_hours <= 24::numeric),
    CONSTRAINT end_report_check CHECK (report_type::text = 'end'::text AND deposited_cash IS NOT NULL OR report_type::text = 'start'::text),
    CONSTRAINT start_report_check CHECK (report_type::text = 'start'::text AND initial_cash IS NOT NULL OR report_type::text = 'end'::text)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.reports
    OWNER to postgres;

-- Funkcja walidująca raport końcowy
CREATE OR REPLACE FUNCTION public.validate_end_report()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF
AS $BODY$
BEGIN
    IF NEW.report_type = 'end' THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM reports 
            WHERE place_id = NEW.place_id 
            AND report_date = NEW.report_date 
            AND report_type = 'start'
        ) THEN
            RAISE EXCEPTION 'Nie można dodać raportu końcowego bez raportu początkowego';
        END IF;
    END IF;
    RETURN NEW;
END;
$BODY$;

-- Trigger: end_report_validation

-- DROP TRIGGER IF EXISTS end_report_validation ON public.reports;

CREATE OR REPLACE TRIGGER end_report_validation
    BEFORE INSERT OR UPDATE 
    ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_end_report();

-- Table: public.report_fruits

-- DROP TABLE IF EXISTS public.report_fruits;

CREATE TABLE IF NOT EXISTS public.report_fruits
(
    id integer NOT NULL DEFAULT nextval('report_fruits_id_seq'::regclass),
    report_id integer NOT NULL,
    fruit_type character varying(20) COLLATE pg_catalog."default" NOT NULL,
    initial_quantity numeric(10,2) NOT NULL,
    remaining_quantity numeric(10,2),
    waste_quantity numeric(10,2),
    price_per_kg numeric(10,2) NOT NULL,
    gross_sales numeric(10,2),
    CONSTRAINT report_fruits_pkey PRIMARY KEY (id),
    CONSTRAINT report_fruits_report_id_fkey FOREIGN KEY (report_id)
        REFERENCES public.reports (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT report_fruits_fruit_type_check CHECK (fruit_type::text = ANY (ARRAY['truskawka'::character varying, 'czeresnia'::character varying, 'borowka'::character varying, 'malina'::character varying, 'jagoda'::character varying, 'wisnia'::character varying, 'agrest'::character varying, 'jajka'::character varying]::text[])),
    CONSTRAINT report_fruits_initial_quantity_check CHECK (initial_quantity >= 0::numeric),
    CONSTRAINT report_fruits_remaining_quantity_check CHECK (remaining_quantity >= 0::numeric),
    CONSTRAINT report_fruits_waste_quantity_check CHECK (waste_quantity >= 0::numeric),
    CONSTRAINT report_fruits_price_per_kg_check CHECK (price_per_kg > 0::numeric),
    CONSTRAINT report_fruits_gross_sales_check CHECK (gross_sales >= 0::numeric),
    CONSTRAINT quantity_validation CHECK ((remaining_quantity + waste_quantity) <= initial_quantity)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.report_fruits
    OWNER to postgres;