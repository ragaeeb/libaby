'use client';

import { createStorage, type Storage } from 'unstorage';
import indexedDBDriver from 'unstorage/drivers/indexedb';

let storagePromise: Promise<Storage<string>> | null = null;

export const getBrowserStorage = async (): Promise<Storage<string>> => {
    if (!storagePromise) {
        storagePromise = Promise.resolve(createStorage<string>({ driver: indexedDBDriver({ base: 'libaby' }) }));
    }

    return storagePromise;
};
