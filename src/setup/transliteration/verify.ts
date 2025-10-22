import type { BunFile } from 'bun';
import { generateWithGemini } from '@/lib/ai/gemini';
import type { ApiKeyManager } from '@/lib/apiKeyManager';
import { chunkArray, validateChunks } from '@/lib/common';
import { commitChunk, mapAIResponseToNamedItems, type NamedItem, serializeItems } from '@/lib/serialization';

export const verifyItems = async (
    items: NamedItem[],
    transliterationsFile: BunFile,
    keyManager: ApiKeyManager,
    promptTemplate: string,
    chunkSize: number = 300,
): Promise<void> => {
    const idToName: Record<string, string> = await transliterationsFile.json();

    const tuples = items.map((item) => ({ ...item, transliteration: idToName[item.id] }));
    const chunks = chunkArray(tuples, chunkSize);
    console.log(`Split into ${chunks.length} chunks, each up to ${chunkSize} items`);

    validateChunks(chunks, items.length);

    for (const chunk of chunks) {
        const apiKey = keyManager.getNext();
        const serialized = serializeItems(chunk.map((c) => [c.id, c.name, c.transliteration]));

        const validateChunkResponse = (text: string) => {
            return text === 'OK' || mapAIResponseToNamedItems(text).length > 0;
        };

        const responseText = await generateWithGemini(
            promptTemplate.replace('{{TRANSLITERATION_DATA}}', serialized),
            apiKey,
            validateChunkResponse,
        );

        if (responseText === 'OK') {
            console.log('No errors');
        } else if (responseText) {
            const itemsToCommit = mapAIResponseToNamedItems(responseText).map((item) => [item.id, item.name]);

            console.log(`Committing ${itemsToCommit.length} to ${transliterationsFile.name}`);

            await commitChunk(transliterationsFile, Object.fromEntries(itemsToCommit));
        }
    }
};
