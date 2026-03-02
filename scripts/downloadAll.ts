import {
    configure,
    denormalizeBooks,
    getMaster,
    type MasterData,
} from 'shamela';
import { compressJsonAsync } from '@/lib/io';

/**
 * Returns the current Unix timestamp in seconds (not milliseconds).
 * Used for lastUpdatedAt fields which track time in seconds for data persistence.
 */
export const nowInSeconds = () => Math.floor(Date.now() / 1000);

const loadMaster = async (): Promise<MasterData> => {
    const masterFile = Bun.file('master.json');

    if (!(await masterFile.exists())) {
        const master = await getMaster();

        await masterFile.write(JSON.stringify(master));

        return master;
    }

    return masterFile.json();
};

export const downloadAll = async () => {
    configure({ logger: console });

    console.log('Load master');
    const master = await loadMaster();
    const books = denormalizeBooks(master);
    await Bun.write('master_denormalized.json', JSON.stringify({ timestamp: nowInSeconds(), books, version: master.version}, null, 2));
    const archiveFile = Bun.file('master.json.br');

    if (!(await archiveFile.exists())) {
        await archiveFile.write(await compressJsonAsync({ timestamp: nowInSeconds(), books, version: master.version}));
    }
};

if (import.meta.main) {
    await downloadAll();
}
