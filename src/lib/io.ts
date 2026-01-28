import { brotliCompress, brotliCompressSync, brotliDecompress, constants as zc } from 'node:zlib';

type CompressOpts = {
    /** Sort object keys recursively before stringify for slightly better compression (default: true). */
    canonical?: boolean;
};

/**
 * Compresses a UTF-8 string using Brotli with parameters tuned for textual data.
 *
 * @param value - The string to compress.
 * @returns A Brotli compressed buffer.
 */
export const compressString = (value: string) => {
    const input = Buffer.from(value, 'utf8');

    // Brotli tuned for max compression of text/JSON
    const params: Record<number, number> = {
        [zc.BROTLI_PARAM_QUALITY]: 11, // max quality
        [zc.BROTLI_PARAM_MODE]: zc.BROTLI_MODE_TEXT, // text model helps JSON
        [zc.BROTLI_PARAM_LGWIN]: 24, // larger window can help redundancy
        [zc.BROTLI_PARAM_SIZE_HINT]: input.length, // small speed win, sometimes ratio too
    };

    return brotliCompressSync(input, { params });
};

const canonicalize = (v: unknown): unknown => {
    if (Array.isArray(v)) {
        return v.map(canonicalize);
    }
    if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
        const out: Record<string, unknown> = {};
        for (const k of Object.keys(v as Record<string, unknown>).sort()) {
            out[k] = canonicalize((v as Record<string, unknown>)[k]);
        }
        return out;
    }
    return v; // primitives, dates (stringified), etc.
};

/**
 * Serializes a value to JSON and compresses it using Brotli, optionally canonicalizing keys
 * for improved compression ratios.
 *
 * @param value - The JSON-compatible value to compress.
 * @param opts - Compression options controlling canonicalization.
 * @returns The compressed JSON buffer.
 */
export const compressJson = (value: unknown, opts: CompressOpts = {}) => {
    const { canonical = true } = opts;
    const json = JSON.stringify(canonical ? canonicalize(value) : value);

    return compressString(json);
};
/**
 * Compresses a UTF-8 string using Brotli with parameters tuned for textual data (Asynchronously).
 *
 * @param value - The string to compress.
 * @returns A promise that resolves to a Brotli compressed buffer.
 */
export const compressStringAsync = (value: string): Promise<Buffer> => {
    const input = Buffer.from(value, 'utf8');
    const params: Record<number, number> = {
        [zc.BROTLI_PARAM_QUALITY]: 11,
        [zc.BROTLI_PARAM_MODE]: zc.BROTLI_MODE_TEXT,
        [zc.BROTLI_PARAM_LGWIN]: 24,
        [zc.BROTLI_PARAM_SIZE_HINT]: input.length,
    };

    return new Promise((resolve, reject) => {
        brotliCompress(input, { params }, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
};

/**
 * Serializes a value to JSON and compresses it using Brotli asynchronously.
 *
 * @param value - The JSON-compatible value to compress.
 * @param opts - Compression options controlling canonicalization.
 * @returns A promise that resolves to the compressed JSON buffer.
 */
export const compressJsonAsync = async (value: unknown, opts: CompressOpts = {}) => {
    const { canonical = true } = opts;
    const json = JSON.stringify(canonical ? canonicalize(value) : value);

    return compressStringAsync(json);
};
/**
 * Decompresses a Brotli-compressed buffer back into a UTF-8 string.
 *
 * @param buffer - The compressed buffer to decompress.
 * @returns A promise that resolves to the decompressed string.
 */
export const decompressStringAsync = (buffer: Buffer | Uint8Array): Promise<string> => {
    return new Promise((resolve, reject) => {
        brotliDecompress(buffer, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result.toString('utf8'));
            }
        });
    });
};

/**
 * Decompresses a Brotli-compressed buffer and parses it as JSON.
 *
 * @param buffer - The compressed buffer to decompress.
 * @returns A promise that resolves to the parsed JSON value.
 */
export const decompressJsonAsync = async <T = unknown>(buffer: Buffer | Uint8Array): Promise<T> => {
    const json = await decompressStringAsync(buffer);
    return JSON.parse(json);
};
