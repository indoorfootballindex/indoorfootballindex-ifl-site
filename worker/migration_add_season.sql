-- Run this ONCE in the D1 console if your standings table already exists
-- (i.e. you already ran the original schema.sql before this update)
-- Run each statement separately.

ALTER TABLE standings ADD COLUMN season INTEGER NOT NULL DEFAULT 2026;

CREATE INDEX IF NOT EXISTS idx_standings_season ON standings(season);
