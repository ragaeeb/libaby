import type { BunFile } from 'bun';

export type NamedItem = { id: number; name: string };

export const serializeItems = <T>(items: T[][]): string => {
    return items.map((item) => item.toString()).join('\n');
};

export const filterUnprocessedItems = (masterItems: NamedItem[], savedIdToName: Record<string, string>) => {
    return masterItems.filter((item) => !savedIdToName[item.id]);
};

/**
 * Removes items from the savedIdToName that are not referenced in the masterItems
 * @param masterItems
 * @param savedIdToName
 */
export const removedOrphaned = (masterItems: NamedItem[], savedIdToName: Record<string, string>) => {
    const result: typeof savedIdToName = {};
    const ids = new Set(masterItems.map((i) => i.id.toString()));

    Object.entries(savedIdToName).forEach(([id, name]) => {
        if (ids.has(id)) {
            result[id] = name;
        } else {
            console.warn('Removing orphaned', id);
        }
    });

    return result;
};

export const commitChunk = async (file: BunFile, data: Record<string, string>) => {
    const existing: Record<string, string> = (await file.exists()) ? await file.json() : {};
    return file.write(JSON.stringify({ ...existing, ...data }, null, 2));
};

export const mapAIResponseToNamedItems = (response: string): NamedItem[] => {
    const items = response
        .trim()
        .split('\n')
        .filter((l) => l.includes(','))
        .map((l) => l.trim())
        .map((line) => {
            const commaIndex = line.indexOf(',');

            const id = parseInt(line.substring(0, commaIndex), 10);
            const name = line.substring(commaIndex + 1);
            return { id, name };
        });

    return items;
};
