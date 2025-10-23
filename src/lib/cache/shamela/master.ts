import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

type MasterData = {
    version: number;
    authors: Array<{ id: number; name: string; is_deleted: string; biography?: string; death_text?: string }>;
    books: Array<{ id: number; name: string; is_deleted: string; author: string; category: string }>;
    categories: Array<{ id: number; name: string; is_deleted: string }>;
};

type TranslationsData = {
    version: number;
    authors?: { transliterations?: Record<string, string> };
    books?: { transliterations?: Record<string, string> };
    categories?: { transliterations?: Record<string, string> };
};

type CachedLibrary = { master: MasterData; translations: TranslationsData | null; loadedAt: number };

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
