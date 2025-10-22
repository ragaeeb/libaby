'use server';

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { MasterData } from 'shamela';

type BookListItem = { id: string; title: string; author: string };

type DownloadedBook = { id: string; library: string; downloadedAt: string };

const getDataDir = () => process.env.DATA_DIR || join(process.cwd(), 'data');

const getDownloadedBooks = async (): Promise<DownloadedBook[]> => {
    const downloadedPath = join(getDataDir(), 'downloaded.json');

    if (!existsSync(downloadedPath)) {
        const mockData: DownloadedBook[] = [
            { downloadedAt: new Date().toISOString(), id: '335', library: 'shamela' },
            { downloadedAt: new Date().toISOString(), id: '336', library: 'shamela' },
            { downloadedAt: new Date().toISOString(), id: '501', library: 'turath' },
        ];
        await writeFile(downloadedPath, JSON.stringify(mockData, null, 2));
        return mockData;
    }

    const content = await readFile(downloadedPath, 'utf-8');
    return JSON.parse(content);
};

const saveDownloadedBook = async (book: DownloadedBook): Promise<void> => {
    const downloaded = await getDownloadedBooks();
    const existing = downloaded.find((b) => b.id === book.id && b.library === book.library);

    if (!existing) {
        downloaded.push(book);
        const downloadedPath = join(getDataDir(), 'downloaded.json');
        await writeFile(downloadedPath, JSON.stringify(downloaded, null, 2));
    }
};

export const getLibraryBooks = async (library: string): Promise<BookListItem[]> => {
    const masterPath = join(getDataDir(), 'libraries', library, 'master.json');

    if (!existsSync(masterPath)) {
        return [];
    }

    const content = await readFile(masterPath, 'utf-8');
    const master: MasterData = JSON.parse(content);

    const downloaded = await getDownloadedBooks();
    const downloadedIds = new Set(downloaded.filter((b) => b.library === library).map((b) => b.id));

    const authorMap = new Map(master.authors.map((a) => [String(a.id), a.name]));

    return master.books
        .filter((book) => book.is_deleted === '0' && downloadedIds.has(String(book.id)))
        .map((book) => ({ author: authorMap.get(book.author) || book.author, id: String(book.id), title: book.name }));
};

export const getBookDetails = async (library: string, bookId: string) => {
    const masterPath = join(getDataDir(), 'libraries', library, 'master.json');

    if (!existsSync(masterPath)) {
        return null;
    }

    const content = await readFile(masterPath, 'utf-8');
    const master: MasterData = JSON.parse(content);

    const translationsPath = join(getDataDir(), 'libraries', library, 'master.en.json');
    let translations: any = null;

    if (existsSync(translationsPath)) {
        const translationsContent = await readFile(translationsPath, 'utf-8');
        translations = JSON.parse(translationsContent);
    }

    const authorMap = new Map(master.authors.map((a) => [String(a.id), a.name]));
    const categoryMap = new Map(master.categories.map((c) => [String(c.id), c.name]));
    const book = master.books.find((b) => String(b.id) === bookId && b.is_deleted === '0');

    if (!book) {
        return null;
    }

    const downloaded = await getDownloadedBooks();
    const downloadedBook = downloaded.find((b) => b.id === bookId && b.library === library);

    return {
        author: authorMap.get(book.author) || book.author,
        authorId: book.author,
        authorTransliteration: translations?.authors?.transliterations?.[book.author],
        category: categoryMap.get(book.category),
        categoryId: book.category,
        categoryTransliteration: translations?.categories?.transliterations?.[book.category],
        chapters: null,
        description: null,
        downloadedAt: downloadedBook ? new Date(downloadedBook.downloadedAt) : null,
        externalId: String(book.id),
        id: book.id,
        library,
        pages: null,
        title: book.name,
        titleTransliteration: translations?.books?.transliterations?.[book.id],
    };
};

export const downloadBook = async (library: string, bookId: string): Promise<void> => {
    await saveDownloadedBook({ downloadedAt: new Date().toISOString(), id: bookId, library });
};
