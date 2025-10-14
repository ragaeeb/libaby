'use server';

import { getRepository, type LibraryConfig } from '@/lib/repository';

export const getConfig = async (): Promise<LibraryConfig> => {
    console.log('SERVER: getConfig called', new Date().toISOString());

    const repo = getRepository();
    return repo.getConfig();
};

export const saveConfig = async (config: LibraryConfig): Promise<void> => {
    const repo = getRepository();
    await repo.setConfig(config);
};
