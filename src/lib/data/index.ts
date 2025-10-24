import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

type MasterData = {
    version: number;
    authors: Array<{ biography?: string; death_text?: string; id: number; is_deleted: string; name: string }>;
    books: Array<{ author: string; category: string; id: number; is_deleted: string; name: string }>;
    categories: Array<{ id: number; is_deleted: string; name: string }>;
};

type TranslationsData = {
    version: number;
    authors?: { transliterations?: Record<string, string> };
    books?: { transliterations?: Record<string, string> };
    categories?: { transliterations?: Record<string, string> };
};

type CachedLibrary = { loadedAt: number; master: MasterData; translations: TranslationsData | null };

type LibraryConfig = { shamela?: string; };

type DownloadedBook = { downloadedAt: string; id: string; library: string };

const cache = new Map<string, CachedLibrary>();
const CACHE_TTL = 1000 * 60 * 60;

const getDataDir = () => process.env.DATA_DIR || join(process.cwd(), 'data');

export const getMasterData = async (library: string): Promise<CachedLibrary | null> => {
    const cached = cache.get(library);

    if (cached && Date.now() - cached.loadedAt < CACHE_TTL) {
        return cached;
    }

    const masterPath = join(getDataDir(), 'libraries', library, 'master.json');

    if (!existsSync(masterPath)) {
        return null;
    }

    const masterContent = await readFile(masterPath, 'utf-8');
    const master: MasterData = JSON.parse(masterContent);

    const translationsPath = join(getDataDir(), 'libraries', library, 'master.en.json');
    let translations: TranslationsData | null = null;

    if (existsSync(translationsPath)) {
        const translationsContent = await readFile(translationsPath, 'utf-8');
        translations = JSON.parse(translationsContent);
    }

    const cachedLibrary: CachedLibrary = { loadedAt: Date.now(), master, translations };

    cache.set(library, cachedLibrary);

    return cachedLibrary;
};

export const clearCache = (library?: string) => {
    if (library) {
        cache.delete(library);
    } else {
        cache.clear();
    }
};

export const getConfig = async (): Promise<LibraryConfig> => {
    const configPath = join(getDataDir(), 'config.json');

    if (!existsSync(configPath)) {
        return {};
    }

    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content);
};

export const setConfig = async (config: LibraryConfig): Promise<void> => {
    const configPath = join(getDataDir(), 'config.json');
    await ensureDir(getDataDir());
    await writeFile(configPath, JSON.stringify(config, null, 2));
};

export const getDownloadedBooks = async (): Promise<DownloadedBook[]> => {
    const downloadedPath = join(getDataDir(), 'downloaded.json');

    if (!existsSync(downloadedPath)) {
        const mockData: DownloadedBook[] = [
            { downloadedAt: new Date().toISOString(), id: '335', library: 'shamela' },
            { downloadedAt: new Date().toISOString(), id: '336', library: 'shamela' },
        ];
        await writeFile(downloadedPath, JSON.stringify(mockData, null, 2));
        return mockData;
    }

    const content = await readFile(downloadedPath, 'utf-8');
    return JSON.parse(content);
};

export const saveDownloadedBook = async (book: DownloadedBook): Promise<void> => {
    const downloaded = await getDownloadedBooks();
    const existing = downloaded.find((b) => b.id === book.id && b.library === book.library);

    if (!existing) {
        downloaded.push(book);
        const downloadedPath = join(getDataDir(), 'downloaded.json');
        await writeFile(downloadedPath, JSON.stringify(downloaded, null, 2));
    }
};

const ensureDir = async (path: string) => {
    if (!existsSync(path)) {
        await mkdir(path, { recursive: true });
    }
};

export { type CachedLibrary, type DownloadedBook, type LibraryConfig, type MasterData, type TranslationsData };