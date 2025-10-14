'use server';

import { getRepository, type LibraryConfig } from '@/lib/repository';

export const getConfig = async (): Promise<LibraryConfig> => {
    const repo = getRepository();
    return repo.getConfig();
};

export const saveConfig = async (config: LibraryConfig): Promise<void> => {
    const repo = getRepository();
    await repo.setConfig(config);
};
