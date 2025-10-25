import { join } from 'node:path';
import { createStorage, type Storage } from 'unstorage';
import fsDriver from 'unstorage/drivers/fs';
import memoryDriver from 'unstorage/drivers/memory';

const storages = new Map<string, Storage<string>>();

const getDataDir = () => process.env.DATA_DIR || join(process.cwd(), 'data');

const getDriver = () => {
    if (process.env.DATA_DRIVER === 'memory') {
        return memoryDriver({});
    }

    return fsDriver({ base: getDataDir() });
};

export const getServerStorage = (): Storage<string> => {
    const key = process.env.DATA_DRIVER === 'memory' ? 'memory' : 'fs';

    if (!storages.has(key)) {
        storages.set(key, createStorage({ driver: getDriver() }));
    }

    return storages.get(key)!;
};
