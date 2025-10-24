'use server';

import { getConfig as getConfigData, type LibraryConfig, setConfig as setConfigData } from '@/lib/data';

export const getConfig = async (): Promise<LibraryConfig> => {
    console.log('SERVER: getConfig called', new Date().toISOString());
    return getConfigData();
};

export const saveConfig = async (config: LibraryConfig): Promise<void> => {
    await setConfigData(config);
};
