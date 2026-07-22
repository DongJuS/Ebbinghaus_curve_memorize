import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * Singleton SQLite connection for the whole app.
 *
 * The database file lives in `data/app.db` (gitignored) and is created and
 * migrated automatically on first access. All schema changes should be added
 * as idempotent statements in `migrate()` so the DB upgrades in place.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = process.env.DATABASE_PATH ?? path.join(DATA_DIR, "app.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  fs.mkdirSync(DATA_DIR, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  migrate(db);

  _db = db;
  return _db;
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS decks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cards (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      deck_id           INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
      parent_id         INTEGER REFERENCES cards(id) ON DELETE SET NULL,
      front             TEXT NOT NULL,
      back              TEXT NOT NULL DEFAULT '',
      note              TEXT NOT NULL DEFAULT '',
      difficulty        TEXT NOT NULL DEFAULT 'medium',
      -- SRS scheduling state
      state             TEXT NOT NULL DEFAULT 'new',       -- new | learning | review
      ease_factor       REAL NOT NULL DEFAULT 2.5,
      interval_days     REAL NOT NULL DEFAULT 0,
      repetitions       INTEGER NOT NULL DEFAULT 0,
      learning_step     INTEGER NOT NULL DEFAULT 0,
      due_at            TEXT NOT NULL DEFAULT (datetime('now')),
      last_reviewed_at  TEXT,
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_cards_deck ON cards(deck_id);
    CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(due_at);

    CREATE TABLE IF NOT EXISTS reviews (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id        INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      reviewed_at    TEXT NOT NULL DEFAULT (datetime('now')),
      rating         TEXT NOT NULL,                          -- again | hard | good | easy
      prev_interval  REAL NOT NULL DEFAULT 0,
      next_interval  REAL NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_card ON reviews(card_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_date ON reviews(reviewed_at);

    CREATE TABLE IF NOT EXISTS questions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      deck_id      INTEGER REFERENCES decks(id) ON DELETE CASCADE,
      card_id      INTEGER REFERENCES cards(id) ON DELETE SET NULL,
      question     TEXT NOT NULL,
      answer       TEXT NOT NULL DEFAULT '',
      difficulty   TEXT NOT NULL DEFAULT 'medium',           -- easy | medium | hard
      source_type  TEXT NOT NULL DEFAULT 'ai',               -- ai | exam
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exam_sources (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      deck_id     INTEGER REFERENCES decks(id) ON DELETE CASCADE,
      content     TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key    TEXT PRIMARY KEY,
      value  TEXT NOT NULL
    );
  `);
}
