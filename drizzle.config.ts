import type { Config } from 'drizzle-kit';

export default {
    dbCredentials: { url: './data/libaby.db' },
    dialect: 'sqlite',
    out: './drizzle',
    schema: './src/db/schema.ts',
} satisfies Config;
