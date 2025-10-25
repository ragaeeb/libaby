import { getServerStorage } from '@/lib/storage/server';

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

type LibraryConfig = { shamela?: string };

type DownloadedBook = { downloadedAt: string; id: string; library: string };

const cache = new Map<string, CachedLibrary>();
const CACHE_TTL = 1000 * 60 * 60;

const storage = getServerStorage();

const readJSON = async <T>(key: string): Promise<T | null> => {
    const content = await storage.getItem(key);

    if (typeof content !== 'string') {
        return null;
    }

    return JSON.parse(content) as T;
};

const writeJSON = async (key: string, value: unknown) => {
    const payload = JSON.stringify(value, null, 2);
    await storage.setItem(key, payload);
};

export const getMasterData = async (library: string): Promise<CachedLibrary | null> => {
    const cached = cache.get(library);

    if (cached && Date.now() - cached.loadedAt < CACHE_TTL) {
        return cached;
    }

    const masterPath = `libraries/${library}/master.json`;

    if (!(await storage.hasItem(masterPath))) {
        return null;
    }

    const master = await readJSON<MasterData>(masterPath);

    if (!master) {
        return null;
    }

    const translationsPath = `libraries/${library}/master.en.json`;
    let translations: TranslationsData | null = null;

    if (await storage.hasItem(translationsPath)) {
        translations = await readJSON<TranslationsData>(translationsPath);
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
    const config = await readJSON<LibraryConfig>('config.json');
    return config ?? {};
};

export const setConfig = async (config: LibraryConfig): Promise<void> => {
    await writeJSON('config.json', config);
};

export const getDownloadedBooks = async (): Promise<DownloadedBook[]> => {
    const downloaded = await readJSON<DownloadedBook[]>('downloaded.json');
    return downloaded ?? [];
};

export const saveDownloadedBook = async (book: DownloadedBook): Promise<void> => {
    const downloaded = await getDownloadedBooks();
    const existing = downloaded.find((b) => b.id === book.id && b.library === book.library);

    if (!existing) {
        downloaded.push(book);
        await writeJSON('downloaded.json', downloaded);
    }
};

export type { CachedLibrary, DownloadedBook, LibraryConfig, MasterData, TranslationsData };
