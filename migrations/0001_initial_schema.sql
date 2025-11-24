-- GalNetOps D1 Database Schema
-- Initial migration for users and systems tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  -- ED CAPI linking (optional)
  frontier_id TEXT,
  commander_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at INTEGER,
  -- Profile data (stored as JSON)
  profile_credits INTEGER,
  profile_debt INTEGER,
  profile_last_system TEXT,
  profile_last_starport TEXT,
  profile_current_body TEXT,
  profile_ship_name TEXT,
  profile_ship_type TEXT,
  profile_ship_ident TEXT,
  -- Ranks (stored as JSON)
  profile_ranks TEXT, -- JSON: {combat, trade, explorer, cqc, empire, federation}
  profile_rank_progress TEXT, -- JSON: {combat, trade, explorer, cqc, empire, federation}
  profile_journal_last_updated TEXT,
  created_at TEXT NOT NULL,
  last_updated TEXT NOT NULL
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_frontier_id ON users(frontier_id);

-- Systems table
CREATE TABLE IF NOT EXISTS systems (
  name TEXT PRIMARY KEY,
  system_address INTEGER NOT NULL,
  -- System data stored as JSON for flexibility
  stars TEXT NOT NULL, -- JSON array of Star objects
  planets TEXT, -- JSON array of Planet objects
  bodies TEXT, -- JSON array of body objects
  biologicals TEXT, -- JSON array of Biological objects
  discovered_by TEXT,
  discovered_timestamp TEXT,
  last_updated TEXT NOT NULL
);

-- Index for system searches (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_systems_name_lower ON systems(LOWER(name));

