import path from 'node:path';
import {
    type Author,
    type Book,
    type BookData,
    type Category,
    configure,
    type DenormalizedBook,
    denormalizeBooks,
    getBook,
    getMaster,
    type MasterData,
} from 'shamela';
import { compressJson } from '@/lib/io';

/**
 * Returns the current Unix timestamp in seconds (not milliseconds).
 * Used for lastUpdatedAt fields which track time in seconds for data persistence.
 */
export const nowInSeconds = () => Math.floor(Date.now() / 1000);

const loadMaster = async (): Promise<MasterData> => {
    const masterFile = Bun.file(path.join('data', 'libraries', 'shamela', 'master.json'));

    if (!(await masterFile.exists())) {
        const master = await getMaster();

        await masterFile.write(JSON.stringify({ ...master, timestamp: nowInSeconds() }, null, 2));

        return master;
    }

    return masterFile.json();
};

type DenormalizedBookData = DenormalizedBook & BookData;

const saveBook = async (bookFile: Bun.BunFile, book: DenormalizedBook) => {
    let attempts = 0;
    let delay = 2000;
    const maxAttempts = 5;

    while (true) {
        try {
            const bookData = await getBook(book.id);
            await bookFile.write(JSON.stringify({ ...book, ...bookData } satisfies DenormalizedBookData, null, 2));
            break;
        } catch (error) {
            if (attempts >= maxAttempts) {
                throw error;
            }
            console.warn(`Error downloading book ${book.id}: ${error}. Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2;
            attempts++;
        }
    }
};

export const downloadAll = async () => {
    configure({ logger: console });

    console.log('Load master');
    const books = denormalizeBooks(await loadMaster());

    console.log('Processing', books.length, 'books');

    for (let i = 0; i < books.length; i++) {
        const book = books[i];
        const bookFile = Bun.file(
            path.format({
                dir: path.join('data', 'libraries', 'shamela', 'books'),
                ext: '.json',
                name: book.id.toString(),
            }),
        );

        if (!(await bookFile.exists())) {
            console.log(`Downloading ${i + 1}/${books.length}`);
            await saveBook(bookFile, book);
        }

        // TODO: Remove this next block
        const bookData: DenormalizedBookData = await bookFile.json();

        if (!bookData.id) {
            Object.assign(bookData, book);
        }

        const archiveFile = Bun.file(
            path.format({
                dir: path.join('data', 'libraries', 'shamela', 'books', 'dataset'),
                ext: '.json.br',
                name: book.id.toString(),
            }),
        );

        if (!(await archiveFile.exists())) {
            console.log('Compressing...', book.id);
            await archiveFile.write(compressJson(bookData));
        }
    }
};

if (import.meta.main) {
    await downloadAll();
}
