-- Drop the existing table if it exists
DROP TABLE IF EXISTS places;

-- Create the places table with auto-incrementing id
CREATE TABLE places (
    id SERIAL PRIMARY KEY,
    name TEXT,
    adress TEXT,
    employes INTEGER[] DEFAULT '{}'::INTEGER[]
);

-- Add any initial data if needed
-- INSERT INTO places (name, adress) VALUES ('Example Place', 'Example Address');
