import { filesystemRepository } from './filesystem';
import type { Repository } from './interface';

export const getRepository = (): Repository => filesystemRepository;

export * from './filesystem';
export * from './interface';
