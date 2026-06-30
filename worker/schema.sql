-- IFL Site D1 Schema
-- Run each block in the Cloudflare D1 console

CREATE TABLE IF NOT EXISTS roster (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  team_code   TEXT NOT NULL,
  team_name   TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  first_name  TEXT NOT NULL,
  jersey      TEXT,
  position    TEXT,
  height      TEXT,
  weight      TEXT,
  college     TEXT,
  level       TEXT,
  status      TEXT DEFAULT 'Active',
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roster_team   ON roster(team_code);
CREATE INDEX IF NOT EXISTS idx_roster_pos    ON roster(position);
CREATE INDEX IF NOT EXISTS idx_roster_status ON roster(status);

CREATE TABLE IF NOT EXISTS transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  team_name   TEXT NOT NULL,
  last_name   TEXT,
  first_name  TEXT,
  jersey      TEXT,
  position    TEXT,
  height      TEXT,
  weight      TEXT,
  college     TEXT,
  level       TEXT,
  trans_type  TEXT,
  trans_date  TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_name, last_name, first_name, trans_type, trans_date)
);

CREATE INDEX IF NOT EXISTS idx_trans_date ON transactions(trans_date);
CREATE INDEX IF NOT EXISTS idx_trans_team ON transactions(team_name);
CREATE INDEX IF NOT EXISTS idx_trans_type ON transactions(trans_type);

CREATE TABLE IF NOT EXISTS standings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  season      INTEGER NOT NULL DEFAULT 2026,
  team_code   TEXT NOT NULL,
  team_name   TEXT NOT NULL,
  conference  TEXT NOT NULL,
  gp          INTEGER DEFAULT 0,
  wins        INTEGER DEFAULT 0,
  losses      INTEGER DEFAULT 0,
  win_pct     REAL DEFAULT 0,
  conf_gp     INTEGER DEFAULT 0,
  conf_wins   INTEGER DEFAULT 0,
  conf_losses INTEGER DEFAULT 0,
  conf_pct    REAL DEFAULT 0,
  sos         REAL DEFAULT 0,
  clinched    TEXT DEFAULT '',
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_standings_season ON standings(season);
