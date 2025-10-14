import { and, eq, like, or } from 'drizzle-orm';
import { bookContent as bookContentTable, books as booksTable, config as configTable, db } from '@/db';
import type { Book, BookContent, LibraryConfig, Repository } from '.';

export const sqliteRepository: Repository = {
    async getBook(library: string, externalId: string): Promise<Book | null> {
        const result = await db
            .select()
            .from(booksTable)
            .where(and(eq(booksTable.library, library), eq(booksTable.externalId, externalId)))
            .get();

        if (!result) {
            return null;
        }

        return {
            ...result,
            chapters: result.chapters ?? null,
            description: result.description ?? null,
            downloadedAt: result.downloadedAt ?? null,
            pages: result.pages ?? null,
        };
    },

    async getBookContent(bookId: number): Promise<BookContent[]> {
        const result = await db.select().from(bookContentTable).where(eq(bookContentTable.bookId, bookId)).all();

        return result.map((content) => ({ ...content, chapterTitle: content.chapterTitle ?? null }));
    },
    async getConfig(): Promise<LibraryConfig> {
        const configs = await db.select().from(configTable).all();
        const result: LibraryConfig = {};

        for (const cfg of configs) {
            if (cfg.key === 'shamela' || cfg.key === 'turath') {
                result[cfg.key] = cfg.value;
            }
        }

        return result;
    },

    async listBooks(library: string): Promise<Book[]> {
        const result = await db.select().from(booksTable).where(eq(booksTable.library, library)).all();

        return result.map((book) => ({
            ...book,
            chapters: book.chapters ?? null,
            description: book.description ?? null,
            downloadedAt: book.downloadedAt ?? null,
            pages: book.pages ?? null,
        }));
    },

    async saveBook(book: Omit<Book, 'id'>): Promise<Book> {
        const result = await db
            .insert(booksTable)
            .values({ ...book, createdAt: new Date(), updatedAt: new Date() })
            .returning()
            .get();

        return {
            ...result,
            chapters: result.chapters ?? null,
            description: result.description ?? null,
            downloadedAt: result.downloadedAt ?? null,
            pages: result.pages ?? null,
        };
    },

    async saveBookContent(content: Omit<BookContent, 'id'>[]): Promise<void> {
        if (content.length === 0) {
            return;
        }

        await db.insert(bookContentTable).values(content.map((c) => ({ ...c, createdAt: new Date() })));
    },

    async searchBooks(query: string): Promise<Book[]> {
        const searchTerm = `%${query}%`;
        const result = await db
            .select()
            .from(booksTable)
            .where(
                or(
                    like(booksTable.title, searchTerm),
                    like(booksTable.author, searchTerm),
                    like(booksTable.description, searchTerm),
                ),
            )
            .all();

        return result.map((book) => ({
            ...book,
            chapters: book.chapters ?? null,
            description: book.description ?? null,
            downloadedAt: book.downloadedAt ?? null,
            pages: book.pages ?? null,
        }));
    },

    async setConfig(config: LibraryConfig): Promise<void> {
        for (const [key, value] of Object.entries(config)) {
            if (value) {
                await db
                    .insert(configTable)
                    .values({ key, updatedAt: new Date(), value })
                    .onConflictDoUpdate({ set: { updatedAt: new Date(), value }, target: configTable.key });
            } else {
                await db.delete(configTable).where(eq(configTable.key, key));
            }
        }
    },
};
