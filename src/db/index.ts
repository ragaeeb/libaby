import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

const getDbPath = () => {
    const dataDir = process.env.DATA_DIR || join(process.cwd(), 'data');
    return join(dataDir, 'libaby.db');
};

const dbPath = getDbPath();

const ensureDataDir = async () => {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
    }
};

await ensureDataDir();

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

// Initialize DB once
let initialized = false;

const initDb = () => {
    if (initialized) {
        return;
    }
    initialized = true;

    const migrationsFolder = join(process.cwd(), 'drizzle');

    if (existsSync(migrationsFolder)) {
        // Use Drizzle migrations if they exist
        try {
            migrate(db, { migrationsFolder });
        } catch (error) {
            if (error instanceof Error && /already applied|already exists/i.test(error.message)) {
                console.log('Migrations already applied or skipped');
            } else {
                throw error;
            }
        }
    } else {
        // Fallback: create schema manually
        console.warn('No migrations folder found, running initial schema setup');
        sqlite.exec(`
            CREATE TABLE IF NOT EXISTS config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT NOT NULL UNIQUE,
                value TEXT NOT NULL,
                updated_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS books (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                external_id TEXT NOT NULL,
                library TEXT NOT NULL,
                title TEXT NOT NULL,
                author TEXT NOT NULL,
                description TEXT,
                chapters INTEGER,
                pages INTEGER,
                metadata TEXT,
                downloaded_at INTEGER,
                created_at INTEGER,
                updated_at INTEGER
            );

            CREATE INDEX IF NOT EXISTS books_library_idx ON books (library);
            CREATE INDEX IF NOT EXISTS books_external_id_idx ON books (external_id);

            CREATE TABLE IF NOT EXISTS book_content (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                book_id INTEGER NOT NULL,
                chapter_number INTEGER NOT NULL,
                chapter_title TEXT,
                content TEXT NOT NULL,
                metadata TEXT,
                created_at INTEGER,
                FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS book_content_book_id_idx ON book_content (book_id);

            CREATE VIRTUAL TABLE IF NOT EXISTS book_content_fts USING fts5(
                content,
                chapter_title,
                content='book_content',
                content_rowid='id'
            );
        `);
    }
};

// Run initialization immediately
initDb();

export * from './schema';
