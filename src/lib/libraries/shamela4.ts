import { join } from 'node:path';
import { configure } from 'shamela';

configure({
    apiKey: process.env.SHAMELA_API_KEY,
    booksEndpoint: process.env.SHAMELA_BOOKS_ENDPOINT,
    masterPatchEndpoint: process.env.SHAMELA_MASTER_ENDPOINT,
    sqlJsWasmUrl: join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
});

export { downloadBook, downloadMasterDatabase, getBook, getBookMetadata, getMaster } from 'shamela';
