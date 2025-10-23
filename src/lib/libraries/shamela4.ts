import { join } from 'node:path';
import { configure } from 'shamela';

const wasmPath = join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');

configure({
    apiKey: process.env.SHAMELA_API_KEY,
    booksEndpoint: process.env.SHAMELA_BOOKS_ENDPOINT,
    masterPatchEndpoint: process.env.SHAMELA_MASTER_ENDPOINT,
    sqlJsWasmUrl: wasmPath,
});

// Re-export functions
export { downloadBook, downloadMasterDatabase, getBook, getBookMetadata, getMaster } from 'shamela';
