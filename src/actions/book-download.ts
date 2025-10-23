'use server';

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getBookMetadata, downloadBook as shamelaDownloadBook } from '@/lib/libraries/shamela4';

const getDataDir = () => process.env.DATA_DIR || join(process.cwd(), 'data');

export type Page = { id: number; content: string; page?: number; part?: string; number?: string };

export type Title = { id: number; content: string; page: number; parent?: number };

export type BookData = { pages: Page[]; titles: Title[] };

export async function downloadBook(library: string, bookId: string): Promise<void> {
    const booksDir = join(getDataDir(), 'libraries', library, 'books');

    if (!existsSync(booksDir)) {
        await mkdir(booksDir, { recursive: true });
    }

    const bookPath = join(booksDir, `${bookId}.json`);

    // Skip if already downloaded
    if (existsSync(bookPath)) {
        return;
    }

    // Download from Shamela
    const metadata = await getBookMetadata(Number(bookId));

    await shamelaDownloadBook(Number(bookId), { bookMetadata: metadata, outputFile: { path: bookPath } });

    // Mark as downloaded
    const downloadedPath = join(getDataDir(), 'downloaded.json');
    const downloaded = existsSync(downloadedPath) ? JSON.parse(await readFile(downloadedPath, 'utf-8')) : [];

    if (!downloaded.find((b: any) => b.id === bookId && b.library === library)) {
        downloaded.push({ downloadedAt: new Date().toISOString(), id: bookId, library });
        await writeFile(downloadedPath, JSON.stringify(downloaded, null, 2));
    }
}

export async function getBookContent(library: string, bookId: string): Promise<BookData | null> {
    const bookPath = join(getDataDir(), 'libraries', library, 'books', `${bookId}.json`);

    if (!existsSync(bookPath)) {
        return null;
    }

    const content = await readFile(bookPath, 'utf-8');
    return JSON.parse(content);
}

export async function getBookPage(library: string, bookId: string, pageId: string): Promise<Page | null> {
    const bookData = await getBookContent(library, bookId);

    if (!bookData) {
        return null;
    }

    return bookData.pages.find((p) => p.id === Number(pageId)) || null;
}
