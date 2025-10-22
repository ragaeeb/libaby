import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Book, BookContent, LibraryConfig, Repository } from './interface';

type ShamelaAuthor = { id: number; name: string; is_deleted: string };

type ShamelaBook = {
    id: number;
    name: string;
    is_deleted: string;
    category: string;
    author: string;
    bibliography?: string;
};

type ShamelaCategory = { id: number; name: string; is_deleted: string };

type ShamelaMaster = { version: number; authors: ShamelaAuthor[]; books: ShamelaBook[]; categories: ShamelaCategory[] };

type ShamelaTranslations = {
    version: number;
    authors?: { transliterations?: Record<string, string> };
    books?: { transliterations?: Record<string, string> };
    categories?: { transliterations?: Record<string, string> };
};

const getDataDir = () => process.env.DATA_DIR || join(process.cwd(), 'data');

const getConfigPath = () => join(getDataDir(), 'config.json');

const ensureDir = async (path: string) => {
    if (!existsSync(path)) {
        await mkdir(path, { recursive: true });
    }
};

const loadShamelaMaster = async (library: string): Promise<ShamelaMaster | null> => {
    const masterPath = join(getDataDir(), 'libraries', library, 'master.json');

    if (!existsSync(masterPath)) {
        return null;
    }

    const content = await readFile(masterPath, 'utf-8');
    return JSON.parse(content);
};

const loadShamelaTranslations = async (library: string): Promise<ShamelaTranslations | null> => {
    const translationsPath = join(getDataDir(), 'libraries', library, 'master.en.json');

    if (!existsSync(translationsPath)) {
        return null;
    }

    const content = await readFile(translationsPath, 'utf-8');
    return JSON.parse(content);
};

export const getShamelaMasterData = async (library: string) => {
    const [master, translations] = await Promise.all([loadShamelaMaster(library), loadShamelaTranslations(library)]);

    return { master, translations };
};

export const filesystemRepository: Repository = {
    async getBook(library: string, externalId: string): Promise<Book | null> {
        const books = await this.listBooks(library);
        return books.find((book) => book.externalId === externalId) || null;
    },

    async getBookContent(bookId: number): Promise<BookContent[]> {
        return [];
    },
    async getConfig(): Promise<LibraryConfig> {
        const configPath = getConfigPath();

        if (!existsSync(configPath)) {
            return {};
        }

        const content = await readFile(configPath, 'utf-8');
        return JSON.parse(content);
    },

    async listBooks(library: string): Promise<Book[]> {
        const master = await loadShamelaMaster(library);

        if (!master) {
            return [];
        }

        const authorMap = new Map(master.authors.map((a) => [String(a.id), a.name]));
        const categoryMap = new Map(master.categories.map((c) => [String(c.id), c.name]));

        return master.books
            .filter((book) => book.is_deleted === '0')
            .map((book) => ({
                author: authorMap.get(book.author) || book.author,
                category: categoryMap.get(book.category) || null,
                chapters: null,
                description: book.bibliography || null,
                downloadedAt: null,
                externalId: String(book.id),
                id: book.id,
                library,
                pages: null,
                title: book.name,
            }));
    },

    async saveBook(book: Omit<Book, 'id'>): Promise<Book> {
        return { id: 0, ...book };
    },

    async saveBookContent(content: Omit<BookContent, 'id'>[]): Promise<void> {},

    async searchBooks(query: string): Promise<Book[]> {
        return [];
    },

    async setConfig(config: LibraryConfig): Promise<void> {
        const configPath = getConfigPath();
        await ensureDir(getDataDir());
        await writeFile(configPath, JSON.stringify(config, null, 2));
    },
};

export { loadShamelaMaster, loadShamelaTranslations, type ShamelaMaster, type ShamelaTranslations };
