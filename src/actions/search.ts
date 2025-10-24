'use server';

import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MeiliSearch } from 'meilisearch';
import { getMasterData } from '@/lib/data';

const getDataDir = () => process.env.DATA_DIR || join(process.cwd(), 'data');

const getClient = () =>
    new MeiliSearch({
        apiKey: process.env.MEILI_MASTER_KEY || 'masterKey',
        host: process.env.MEILI_HOST || 'http://localhost:7700',
    });

type SearchHit = {
    authorId: string;
    authorName: string;
    bookId: string;
    bookTitle: string;
    content: string;
    id: string;
    pageId: number;
    pageNumber?: string;
};

type SearchResult = {
    authorId: string;
    authorName: string;
    bookId: string;
    bookTitle: string;
    content: string;
    pageId: number;
    pageNumber?: string;
};

export const indexBooks = async (library: string) => {
    const client = getClient();
    const indexName = `${library}_books`;

    const index = client.index(indexName);

    await client.createIndex(indexName, { primaryKey: 'id' });

    await index.updateSettings({
        filterableAttributes: ['bookId', 'authorId'],
        searchableAttributes: ['content', 'bookTitle', 'authorName'],
        sortableAttributes: ['pageId'],
    });

    const booksDir = join(getDataDir(), 'libraries', library, 'books');

    if (!existsSync(booksDir)) {
        return;
    }

    const files = await readdir(booksDir);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    const masterData = await getMasterData(library);
    if (!masterData) {
        return;
    }

    const authorMap = new Map(masterData.master.authors.map((a) => [String(a.id), a.name]));

    for (const file of jsonFiles) {
        const bookId = file.replace('.json', '');
        const filePath = join(booksDir, file);
        const content = await readFile(filePath, 'utf-8');
        const bookData = JSON.parse(content);

        const book = masterData.master.books.find((b) => String(b.id) === bookId);
        if (!book) {
            continue;
        }

        const documents = bookData.pages
            .filter((p: any) => p.content && !p.content.includes('is_deleted'))
            .map((p: any) => ({
                authorId: book.author,
                authorName: authorMap.get(book.author) || book.author,
                bookId,
                bookTitle: book.name,
                content: p.content.split('_________')[0],
                id: `${bookId}_${p.id}`,
                pageId: p.id,
                pageNumber: p.number || p.page?.toString(),
            }));

        if (documents.length > 0) {
            await index.addDocuments(documents, { primaryKey: 'id' });
        }
    }
};

export const searchBooks = async (library: string, query: string, bookId?: string): Promise<SearchResult[]> => {
    if (!query.trim()) {
        return [];
    }

    const client = getClient();
    const indexName = `${library}_books`;

    try {
        const index = client.index(indexName);

        const results = await index.search<SearchHit>(query, {
            filter: bookId ? `bookId = ${bookId}` : undefined,
            limit: 100,
        });

        return results.hits.map((hit) => ({
            authorId: hit.authorId,
            authorName: hit.authorName,
            bookId: hit.bookId,
            bookTitle: hit.bookTitle,
            content: hit.content,
            pageId: hit.pageId,
            pageNumber: hit.pageNumber,
        }));
    } catch {
        return [];
    }
};
