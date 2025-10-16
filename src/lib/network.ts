import path from 'node:path';

export const loadOrDownload = async <T>(
    fileName: string,
    getter: () => Promise<T>,
    dir: string,
    forceRefresh = false,
): Promise<T> => {
    const file = Bun.file(path.format({ dir, ext: '.json', name: fileName }));

    if (!forceRefresh && (await file.exists())) {
        return file.json();
    } else {
        console.info(`Downloading ${fileName}`);
        const data = await getter();

        if (!forceRefresh) {
            console.info(`Saving ${fileName}`);
            await file.write(JSON.stringify(data, null, 2));
        }

        return data;
    }
};
