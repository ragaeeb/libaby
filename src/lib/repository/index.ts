import type { Repository } from './interface';
import { sqliteRepository } from './sqlite';

export const getRepository = (): Repository => {
    return sqliteRepository;
};

export * from './interface';
