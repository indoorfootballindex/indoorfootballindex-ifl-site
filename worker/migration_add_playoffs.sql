-- Run this ONCE in the D1 console if you already have the standings table
-- Adds playoff win/loss tracking. Run each statement separately.

ALTER TABLE standings ADD COLUMN playoff_wins INTEGER DEFAULT 0;

ALTER TABLE standings ADD COLUMN playoff_losses INTEGER DEFAULT 0;
