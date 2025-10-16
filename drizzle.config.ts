import type { Config } from 'drizzle-kit';

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

export default {
    dbCredentials:
        TURSO_URL && TURSO_TOKEN ? { authToken: TURSO_TOKEN, url: TURSO_URL } : { url: 'file:./data/libaby.db' },
    dialect: 'turso',
    out: './drizzle',
    schema: './src/db/schema.ts',
} satisfies Config;
