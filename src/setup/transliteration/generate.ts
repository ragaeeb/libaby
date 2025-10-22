import path from 'node:path';
import { generateWithGemini } from '@/lib/ai/gemini';
import type { ApiKeyManager } from '@/lib/apiKeyManager';
import { chunkArray, validateChunks } from '@/lib/common';
import {
    commitChunk,
    filterUnprocessedItems,
    mapAIResponseToNamedItems,
    type NamedItem,
    removedOrphaned,
    serializeItems,
} from '@/lib/serialization';

export const processTransliterations = async (
    items: NamedItem[],
    type: 'authors' | 'books' | 'categories',
    keyManager: ApiKeyManager,
    promptTemplate: string,
    chunkSize: number = 300,
): Promise<void> => {
    console.log(`${type} to process: ${items.length}, chunkSize=${chunkSize}`);

    const outputFile = Bun.file(path.format({ ext: '.json', name: `${type}_tr` }));
    let idToName: Record<string, string> = (await outputFile.exists()) ? await outputFile.json() : {};

    idToName = removedOrphaned(items, idToName);
    const unprocessed = filterUnprocessedItems(items, idToName);

    if (unprocessed.length === 0) {
        console.log(`✓ All ${type} already transliterated (${items.length} items)`);
        return;
    }

    console.log(`Found ${unprocessed.length} unprocessed items (${items.length - unprocessed.length} already done)`);

    const chunks = chunkArray(unprocessed, chunkSize);
    console.log(`Split into ${chunks.length} chunks, each up to ${chunkSize} items`);

    validateChunks(chunks, unprocessed.length);

    for (const chunk of chunks) {
        const apiKey = keyManager.getNext();
        const serialized = serializeItems(chunk.map((n) => [n.id, n.name]));

        const validateChunkResponse = (text: string) => {
            return mapAIResponseToNamedItems(text).length === chunk.length;
        };

        const responseText = await generateWithGemini(
            promptTemplate.replace('{{TRANSLITERATION_DATA}}', serialized),
            apiKey,
            validateChunkResponse,
        );

        if (responseText) {
            const itemsToCommit = mapAIResponseToNamedItems(responseText).map((item) => [item.id, item.name]);

            console.log(`Committing ${itemsToCommit.length} to ${outputFile.name}`);

            await commitChunk(outputFile, Object.fromEntries(itemsToCommit));
        }
    }
};
