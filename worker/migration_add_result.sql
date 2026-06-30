-- Run this ONCE in the D1 console if you already ran the original schema.sql / migration_add_season.sql
-- Adds a free-text "result" column for playoff outcomes (e.g. "Won United Bowl (RiverCity) 71-62")

ALTER TABLE standings ADD COLUMN result TEXT DEFAULT '';
