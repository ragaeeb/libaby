import path from 'node:path';
import type { MasterData } from 'shamela';
import { ApiKeyManager } from '@/lib/apiKeyManager';
import { downloadMasterWithVersion } from '@/lib/libraries/shamela4';
import { loadOrDownload } from '@/lib/network';
import type { NamedItem } from '@/lib/serialization';
import { processTransliterations } from '@/setup/transliteration/generate';
import { verifyItems } from '@/setup/transliteration/verify';

const [, , action] = process.argv;
const keyManager = new ApiKeyManager(process.env.GOOGLE_API_KEY!);

const verifyTransliterations = async () => {
    const [promptTemplate, master]: [string, MasterData] = await Promise.all([
        Bun.file(path.join('scripts', 'prompts', 'verifyTransliterations.txt')).text(),
        await Bun.file('master.json').json(),
    ]);

    await verifyItems(master.authors, Bun.file('authors_tr.json'), keyManager, promptTemplate);
    await verifyItems(master.books, Bun.file('books_tr.json'), keyManager, promptTemplate);
    await verifyItems(master.categories, Bun.file('categories_tr.json'), keyManager, promptTemplate);
};

const transliterate = async () => {
    const master = await loadOrDownload('master', downloadMasterWithVersion, '.');
    const promptTemplate = await Bun.file(path.join('scripts', 'prompts', 'transliteration.txt')).text();

    for (const key of ['authors', 'books', 'categories'] as Array<keyof typeof master>) {
        await processTransliterations(master[key] as NamedItem[], key as any, keyManager, promptTemplate);
    }
};

switch (action) {
    case '--verify':
        await verifyTransliterations();
        break;
    case '--transliterate':
        await transliterate();
        break;
    default:
        break;
}
