import path from 'node:path';
import { decompressJsonAsync } from '@/lib/io';

const decompress = async () => {
    const bookId = process.argv[2];

    if (!bookId) {
        console.error('Please provide a book ID: bun run scripts/decompress.ts <bookId>');
        process.exit(1);
    }

    const archivePath = path.join('data', 'libraries', 'shamela', 'books', 'dataset', `${bookId}.json.br`);
    const archiveFile = Bun.file(archivePath);

    if (!(await archiveFile.exists())) {
        console.error(`Archive not found at: ${archivePath}`);
        process.exit(1);
    }

    console.log(`Decompressing ${archivePath}...`);

    try {
        const buffer = await archiveFile.arrayBuffer();
        const data = await decompressJsonAsync(new Uint8Array(buffer));

        console.log('Decompression successful!');
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Failed to decompress:', error);
        process.exit(1);
    }
};

await decompress();
