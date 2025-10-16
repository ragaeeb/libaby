import { downloadMasterDatabase, getMasterMetadata, type MasterData, setLogger } from 'shamela';

export const downloadMasterWithVersion = async () => {
    setLogger(console);

    const masterMetadata = await getMasterMetadata();
    const masterPath = await downloadMasterDatabase({ masterMetadata, outputFile: { path: 'master.json' } });
    const master: MasterData = await Bun.file(masterPath).json();

    setLogger();

    return { version: masterMetadata.version, ...master };
};
