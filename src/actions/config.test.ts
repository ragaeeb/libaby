import { describe, expect, it, mock } from 'bun:test';
import type { LibraryConfig, Repository } from '@/lib/repository/interface';

const createMockRepo = (): Repository => ({
    getBook: mock(() => Promise.resolve(null)),
    getBookContent: mock(() => Promise.resolve([])),
    getConfig: mock(() => Promise.resolve({})),
    listBooks: mock(() => Promise.resolve([])),
    saveBook: mock(() => Promise.resolve({} as any)),
    saveBookContent: mock(() => Promise.resolve()),
    searchBooks: mock(() => Promise.resolve([])),
    setConfig: mock(() => Promise.resolve()),
});

const getConfig = async (repo: Repository): Promise<LibraryConfig> => {
    return repo.getConfig();
};

const saveConfig = async (repo: Repository, config: LibraryConfig): Promise<void> => {
    await repo.setConfig(config);
};

describe('config actions', () => {
    describe('getConfig', () => {
        it('should return empty config when no keys are set', async () => {
            const repo = createMockRepo();
            (repo.getConfig as ReturnType<typeof mock>).mockResolvedValueOnce({});

            const result = await getConfig(repo);

            expect(result).toEqual({});
            expect(repo.getConfig).toHaveBeenCalledTimes(1);
        });

        it('should return shamela config when set', async () => {
            const repo = createMockRepo();
            (repo.getConfig as ReturnType<typeof mock>).mockResolvedValueOnce({ shamela: 'test-key-123' });

            const result = await getConfig(repo);

            expect(result).toEqual({ shamela: 'test-key-123' });
            expect(repo.getConfig).toHaveBeenCalledTimes(1);
        });

        it('should return turath config when set', async () => {
            const repo = createMockRepo();
            (repo.getConfig as ReturnType<typeof mock>).mockResolvedValueOnce({ turath: 'turath-key-456' });

            const result = await getConfig(repo);

            expect(result).toEqual({ turath: 'turath-key-456' });
            expect(repo.getConfig).toHaveBeenCalledTimes(1);
        });

        it('should return both configs when both are set', async () => {
            const repo = createMockRepo();
            (repo.getConfig as ReturnType<typeof mock>).mockResolvedValueOnce({
                shamela: 'shamela-key',
                turath: 'turath-key',
            });

            const result = await getConfig(repo);

            expect(result).toEqual({ shamela: 'shamela-key', turath: 'turath-key' });
            expect(repo.getConfig).toHaveBeenCalledTimes(1);
        });
    });

    describe('saveConfig', () => {
        it('should save empty config', async () => {
            const repo = createMockRepo();

            await saveConfig(repo, {});

            expect(repo.setConfig).toHaveBeenCalledWith({});
            expect(repo.setConfig).toHaveBeenCalledTimes(1);
        });

        it('should save shamela config', async () => {
            const repo = createMockRepo();
            const config = { shamela: 'new-shamela-key' };

            await saveConfig(repo, config);

            expect(repo.setConfig).toHaveBeenCalledWith(config);
            expect(repo.setConfig).toHaveBeenCalledTimes(1);
        });

        it('should save turath config', async () => {
            const repo = createMockRepo();
            const config = { turath: 'new-turath-key' };

            await saveConfig(repo, config);

            expect(repo.setConfig).toHaveBeenCalledWith(config);
            expect(repo.setConfig).toHaveBeenCalledTimes(1);
        });

        it('should save both configs', async () => {
            const repo = createMockRepo();
            const config = { shamela: 'shamela-key', turath: 'turath-key' };

            await saveConfig(repo, config);

            expect(repo.setConfig).toHaveBeenCalledWith(config);
            expect(repo.setConfig).toHaveBeenCalledTimes(1);
        });

        it('should save config with undefined values', async () => {
            const repo = createMockRepo();
            const config = { shamela: undefined, turath: 'turath-key' };

            await saveConfig(repo, config);

            expect(repo.setConfig).toHaveBeenCalledWith(config);
            expect(repo.setConfig).toHaveBeenCalledTimes(1);
        });
    });
});
