'use server';

import { getBook, getBookMetadata } from '@/lib/libraries/shamela4';
import { getServerStorage } from '@/lib/storage/server';
import { saveDownloadedBook } from '@/lib/data';

export type Page = { id: number; content: string; page?: number; part?: string; number?: string };

export type Title = { id: number; content: string; page: number; parent?: number };

export type BookData = { pages: Page[]; titles: Title[] };

const storage = getServerStorage();

export async function downloadBook(library: string, bookId: string): Promise<BookData> {
    const bookPath = `libraries/${library}/books/${bookId}.json`;

    if (await storage.hasItem(bookPath)) {
        const cached = await storage.getItem(bookPath);
        if (typeof cached === 'string') {
            return JSON.parse(cached) as BookData;
        }
    }

    const [metadata, bookData] = await Promise.all([getBookMetadata(Number(bookId)), getBook(Number(bookId))]);

    const payload = JSON.stringify(bookData);
    await storage.setItem(bookPath, payload);

    await saveDownloadedBook({ downloadedAt: new Date().toISOString(), id: bookId, library });

    if (metadata) {
        await storage.setItem(`libraries/${library}/books/${bookId}.metadata.json`, JSON.stringify(metadata));
    }

    return bookData;
}

export async function getBookContent(library: string, bookId: string): Promise<BookData | null> {
    const bookPath = `libraries/${library}/books/${bookId}.json`;
    const content = await storage.getItem(bookPath);

    if (typeof content !== 'string') {
        return null;
    }

    return JSON.parse(content) as BookData;
}

export async function getBookPage(library: string, bookId: string, pageId: string): Promise<Page | null> {
    const bookData = await getBookContent(library, bookId);

    if (!bookData) {
        return null;
    }

    return bookData.pages.find((p) => p.id === Number(pageId)) || null;
}
