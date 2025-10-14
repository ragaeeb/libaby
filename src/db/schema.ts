import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const config = sqliteTable('config', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    key: text('key').notNull().unique(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    value: text('value').notNull(),
});

export const books = sqliteTable('books', {
    author: text('author').notNull(),
    chapters: integer('chapters'),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    description: text('description'),
    downloadedAt: integer('downloaded_at', { mode: 'timestamp' }),
    externalId: text('external_id').notNull(),
    id: integer('id').primaryKey({ autoIncrement: true }),
    library: text('library').notNull(),
    metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
    pages: integer('pages'),
    title: text('title').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const bookContent = sqliteTable('book_content', {
    bookId: integer('book_id')
        .notNull()
        .references(() => books.id, { onDelete: 'cascade' }),
    chapterNumber: integer('chapter_number').notNull(),
    chapterTitle: text('chapter_title'),
    content: text('content').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    id: integer('id').primaryKey({ autoIncrement: true }),
    metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
});

export type Config = typeof config.$inferSelect;
export type ConfigInsert = typeof config.$inferInsert;
export type Book = typeof books.$inferSelect;
export type BookInsert = typeof books.$inferInsert;
export type BookContent = typeof bookContent.$inferSelect;
export type BookContentInsert = typeof bookContent.$inferInsert;
