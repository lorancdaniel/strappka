-- Create places table if it doesn't exist
CREATE TABLE IF NOT EXISTS places (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    adress VARCHAR(255) NOT NULL,
    employes JSONB DEFAULT '[]'::jsonb
);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_places_name ON places(name);
