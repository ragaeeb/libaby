import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from './schema';

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

const createDb = async () => {
    // Use Turso if credentials are provided
    if (TURSO_URL && TURSO_TOKEN) {
        const client = createClient({ authToken: TURSO_TOKEN, url: TURSO_URL });
        return drizzle(client, { schema });
    }

    // Fall back to local SQLite file
    const { existsSync } = await import('node:fs');
    const { mkdir } = await import('node:fs/promises');
    const { dirname, join } = await import('node:path');

    const dataDir = process.env.DATA_DIR || join(process.cwd(), 'data');
    const dbPath = join(dataDir, 'libaby.db');
    const dir = dirname(dbPath);

    if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
    }

    const client = createClient({ url: `file:${dbPath}` });

    return drizzle(client, { schema });
};

export const db = await createDb();

// Initialize DB once
let initialized = false;

const initDb = async () => {
    if (initialized) {
        return;
    }
    initialized = true;

    const { existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    const migrationsFolder = join(process.cwd(), 'drizzle');

    if (existsSync(migrationsFolder)) {
        try {
            await migrate(db, { migrationsFolder });
        } catch (error) {
            if (error instanceof Error && /already applied|already exists/i.test(error.message)) {
                console.log('Migrations already applied or skipped');
            } else {
                throw error;
            }
        }
    } else {
        console.warn('No migrations folder found, running initial schema setup');

        await db.run(`
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
        `);
    }
};

await initDb();

export * from './schema';
