/**
 * Database Migration System
 *
 * Migrations are versioned SQL changes that are applied in order.
 * Each migration has a unique version number and is only run once.
 * The current schema version is stored in the settings table.
 */

import type Database from 'better-sqlite3';
import { normalizePlanetClass, normalizeStarType } from '../../shared/normalization';

/**
 * Represents a database migration
 */
export interface Migration {
  /** Unique version number - migrations run in ascending order */
  version: number;
  /** Human-readable description of what this migration does */
  description: string;
  /** SQL statements to apply this migration */
  up: (db: Database.Database) => void;
}

/**
 * Migration 001: Initial Schema
 * Creates all base tables for the application
 */
const migration001: Migration = {
  version: 1,
  description: 'Initial schema - systems, bodies, biologicals, route_history, settings tables',
  up: (db) => {
    // Systems table
    db.exec(`
      CREATE TABLE IF NOT EXISTS systems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        system_address INTEGER UNIQUE NOT NULL,
        name TEXT NOT NULL,
        star_pos_x REAL NOT NULL,
        star_pos_y REAL NOT NULL,
        star_pos_z REAL NOT NULL,
        first_visited DATETIME NOT NULL,
        last_visited DATETIME NOT NULL,
        body_count INTEGER,
        discovered_count INTEGER DEFAULT 0,
        mapped_count INTEGER DEFAULT 0,
        total_value INTEGER DEFAULT 0
      )
    `);

    // Bodies table
    db.exec(`
      CREATE TABLE IF NOT EXISTS bodies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        system_id INTEGER NOT NULL,
        body_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        body_type TEXT NOT NULL,
        sub_type TEXT,
        distance_ls REAL,
        mass REAL,
        radius REAL,
        gravity REAL,
        temperature REAL,
        atmosphere_type TEXT,
        volcanism TEXT,
        landable INTEGER DEFAULT 0,
        terraformable INTEGER DEFAULT 0,
        was_discovered INTEGER DEFAULT 0,
        was_mapped INTEGER DEFAULT 0,
        discovered_by_me INTEGER DEFAULT 0,
        mapped_by_me INTEGER DEFAULT 0,
        scan_type TEXT DEFAULT 'None',
        scan_value INTEGER DEFAULT 0,
        bio_signals INTEGER DEFAULT 0,
        geo_signals INTEGER DEFAULT 0,
        parent_id INTEGER,
        raw_json TEXT,
        FOREIGN KEY (system_id) REFERENCES systems(id),
        UNIQUE(system_id, body_id)
      )
    `);

    // Biologicals table
    db.exec(`
      CREATE TABLE IF NOT EXISTS biologicals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        body_id INTEGER NOT NULL,
        genus TEXT NOT NULL,
        species TEXT NOT NULL,
        variant TEXT,
        value INTEGER DEFAULT 0,
        scanned INTEGER DEFAULT 0,
        scan_progress INTEGER DEFAULT 0,
        FOREIGN KEY (body_id) REFERENCES bodies(id)
      )
    `);

    // Route history table
    db.exec(`
      CREATE TABLE IF NOT EXISTS route_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        system_id INTEGER NOT NULL,
        timestamp DATETIME NOT NULL,
        jump_distance REAL,
        fuel_used REAL,
        session_id TEXT,
        FOREIGN KEY (system_id) REFERENCES systems(id)
      )
    `);

    // Settings table (used for schema version tracking and app settings)
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // Basic indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_systems_address ON systems(system_address);
      CREATE INDEX IF NOT EXISTS idx_bodies_system ON bodies(system_id);
      CREATE INDEX IF NOT EXISTS idx_route_timestamp ON route_history(timestamp);
    `);
  }
};

/**
 * Migration 002: Add all_bodies_found column
 * Tracks when FSS scan discovers all bodies in a system
 */
const migration002: Migration = {
  version: 2,
  description: 'Add all_bodies_found column to systems table',
  up: (db) => {
    // Check if column exists before adding
    const tableInfo = db.pragma('table_info(systems)') as Array<{ name: string }>;
    const columnExists = tableInfo.some(col => col.name === 'all_bodies_found');
    
    if (!columnExists) {
      db.exec(`ALTER TABLE systems ADD COLUMN all_bodies_found INTEGER DEFAULT 0`);
    }
  }
};

/**
 * Migration 003: Add performance indexes
 * Adds indexes for common query patterns
 */
const migration003: Migration = {
  version: 3,
  description: 'Add performance indexes for common queries',
  up: (db) => {
    // Index on bodies.sub_type for statistics queries (body type breakdown)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_bodies_sub_type ON bodies(sub_type)`);
    
    // Index on route_history.session_id for session filtering
    db.exec(`CREATE INDEX IF NOT EXISTS idx_route_session ON route_history(session_id)`);
    
    // Composite index for bodies by system ordered by distance
    db.exec(`CREATE INDEX IF NOT EXISTS idx_bodies_system_distance ON bodies(system_id, distance_ls)`);
    
    // Index on systems.last_visited for recent systems queries
    db.exec(`CREATE INDEX IF NOT EXISTS idx_systems_last_visited ON systems(last_visited)`);
  }
};

/**
 * Migration 004: Add semi_major_axis column
 * Stores orbital semi-major axis for proper tree sorting
 */
const migration004: Migration = {
  version: 4,
  description: 'Add semi_major_axis column to bodies table for orbital sorting',
  up: (db) => {
    // Check if column exists before adding
    const tableInfo = db.pragma('table_info(bodies)') as Array<{ name: string }>;
    const columnExists = tableInfo.some(col => col.name === 'semi_major_axis');
    
    if (!columnExists) {
      db.exec(`ALTER TABLE bodies ADD COLUMN semi_major_axis REAL`);
    }
    
    // Add index for parent-child queries (helpful for tree building)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_bodies_parent ON bodies(system_id, parent_id)`);
  }
};

/**
 * Migration 005: Add EDSM cache table
 * Persistent cache for EDSM API responses to reduce API calls
 */
const migration005: Migration = {
  version: 5,
  description: 'Add edsm_cache table for persistent API response caching',
  up: (db) => {
    // EDSM cache table stores API responses with expiration
    db.exec(`
      CREATE TABLE IF NOT EXISTS edsm_cache (
        cache_key TEXT PRIMARY KEY,
        cache_type TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
      )
    `);

    // Index for expiry cleanup queries
    db.exec(`CREATE INDEX IF NOT EXISTS idx_edsm_cache_expires ON edsm_cache(expires_at)`);
    
    // Index for cache type queries
    db.exec(`CREATE INDEX IF NOT EXISTS idx_edsm_cache_type ON edsm_cache(cache_type)`);
  }
};

/**
 * Migration 006: Add codex_entries table
 * Stores Codex discoveries from CodexEntry journal events
 */
const migration006: Migration = {
  version: 6,
  description: 'Add codex_entries table for tracking Codex discoveries',
  up: (db) => {
    // Codex entries table stores all CodexEntry events
    db.exec(`
      CREATE TABLE IF NOT EXISTS codex_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        subcategory TEXT NOT NULL,
        region TEXT NOT NULL,
        system_name TEXT NOT NULL,
        system_address INTEGER NOT NULL,
        body_id INTEGER,
        is_new_entry INTEGER DEFAULT 0,
        new_traits_discovered INTEGER DEFAULT 0,
        voucher_amount INTEGER DEFAULT 0,
        timestamp DATETIME NOT NULL,
        UNIQUE(entry_id, region)
      )
    `);

    // Index for entry lookups
    db.exec(`CREATE INDEX IF NOT EXISTS idx_codex_entry_id ON codex_entries(entry_id)`);
    
    // Index for category/subcategory filtering
    db.exec(`CREATE INDEX IF NOT EXISTS idx_codex_category ON codex_entries(category, subcategory)`);
    
    // Index for region filtering
    db.exec(`CREATE INDEX IF NOT EXISTS idx_codex_region ON codex_entries(region)`);
    
    // Index for timestamp ordering
    db.exec(`CREATE INDEX IF NOT EXISTS idx_codex_timestamp ON codex_entries(timestamp)`);
  }
};

/**
 * Migration 007: Add human_signals and thargoid_signals to bodies
 * For SAASignalsFound / FSSBodySignals with $SAA_SignalType_Human; / Thargoid
 */
const migration007: Migration = {
  version: 7,
  description: 'Add human_signals and thargoid_signals columns to bodies table',
  up: (db) => {
    const tableInfo = db.pragma('table_info(bodies)') as Array<{ name: string }>;
    if (!tableInfo.some((c) => c.name === 'human_signals')) {
      db.exec(`ALTER TABLE bodies ADD COLUMN human_signals INTEGER DEFAULT 0`);
    }
    if (!tableInfo.some((c) => c.name === 'thargoid_signals')) {
      db.exec(`ALTER TABLE bodies ADD COLUMN thargoid_signals INTEGER DEFAULT 0`);
    }
  }
};

/**
 * Migration 008: Add estimated_fss_value and estimated_dss_value to systems
 * For Explorer header and Route history "Est. FSS Value" and "Est. DSS Value" (max)
 */
const migration008: Migration = {
  version: 8,
  description: 'Add estimated_fss_value and estimated_dss_value to systems table',
  up: (db) => {
    const tableInfo = db.pragma('table_info(systems)') as Array<{ name: string }>;
    if (!tableInfo.some(col => col.name === 'estimated_fss_value')) {
      db.exec(`ALTER TABLE systems ADD COLUMN estimated_fss_value INTEGER DEFAULT 0`);
    }
    if (!tableInfo.some(col => col.name === 'estimated_dss_value')) {
      db.exec(`ALTER TABLE systems ADD COLUMN estimated_dss_value INTEGER DEFAULT 0`);
    }
  }
};

/**
 * Migration 009: Normalize bodies.sub_type to canonical keys (planet class / star type)
 * Ensures existing journal/EDSM casing (e.g. "Rocky body") is stored as canonical ("rocky_body").
 */
const migration009: Migration = {
  version: 9,
  description: 'Normalize bodies.sub_type to canonical planet class / star type keys',
  up: (db) => {
    const rows = db
      .prepare("SELECT id, body_type, sub_type FROM bodies WHERE sub_type IS NOT NULL AND sub_type != ''")
      .all() as Array<{ id: number; body_type: string; sub_type: string }>;
    const updateStmt = db.prepare('UPDATE bodies SET sub_type = ? WHERE id = ?');
    for (const row of rows) {
      const canonical =
        row.body_type === 'Star'
          ? normalizeStarType(row.sub_type)
          : normalizePlanetClass(row.sub_type);
      if (canonical) {
        updateStmt.run(canonical, row.id);
      }
    }
  },
};

/**
 * Migration 010: Add was_footfalled and footfalled_by_me to bodies
 * Tracks First Footfall status from journal Scan events (WasFootfalled field)
 */
const migration010: Migration = {
  version: 10,
  description: 'Add was_footfalled and footfalled_by_me columns to bodies table',
  up: (db) => {
    const tableInfo = db.pragma('table_info(bodies)') as Array<{ name: string }>;
    if (!tableInfo.some((c) => c.name === 'was_footfalled')) {
      db.exec(`ALTER TABLE bodies ADD COLUMN was_footfalled INTEGER DEFAULT 0`);
    }
    if (!tableInfo.some((c) => c.name === 'footfalled_by_me')) {
      db.exec(`ALTER TABLE bodies ADD COLUMN footfalled_by_me INTEGER DEFAULT 0`);
    }
  }
};

/**
 * Migration 011: Deduplicate biologicals and add unique index
 * The biologicals table lacked a UNIQUE constraint on (body_id, genus, species),
 * so the ON CONFLICT upsert never fired and duplicate rows were created for
 * each scan stage (Log/Sample/Analyse). This migration removes duplicates
 * (keeping the row with the highest scan_progress) and adds the unique index.
 */
const migration011: Migration = {
  version: 11,
  description: 'Deduplicate biologicals rows and add unique index on (body_id, genus, species)',
  up: (db) => {
    // Deduplicate: keep the row with highest scan_progress for each (body_id, genus, species)
    db.exec(`
      DELETE FROM biologicals
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY body_id, genus, species
            ORDER BY scan_progress DESC, scanned DESC, id DESC
          ) AS rn
          FROM biologicals
        ) WHERE rn = 1
      )
    `);

    // Add unique index to enforce uniqueness going forward
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_biologicals_body_species ON biologicals(body_id, genus, species)`);
  }
};

/**
 * All migrations in order of version
 * Add new migrations to the end of this array
 */
export const migrations: Migration[] = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
  migration006,
  migration007,
  migration008,
  migration009,
  migration010,
  migration011,
];

/**
 * Get all migrations that need to be run
 * @param currentVersion The current schema version (0 if fresh install)
 * @returns Migrations with version > currentVersion, sorted by version
 */
export function getPendingMigrations(currentVersion: number): Migration[] {
  return migrations
    .filter(m => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);
}

/**
 * Get the latest migration version
 * @returns The highest version number in the migrations array
 */
export function getLatestVersion(): number {
  return Math.max(...migrations.map(m => m.version), 0);
}
