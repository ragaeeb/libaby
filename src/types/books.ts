import type { BookData, DenormalizedBook, Page, Title } from "shamela";

export type { BookData, DenormalizedBook, Page, Title };

export type MasterArchive = {
  timestamp: number;
  books: DenormalizedBook[];
  version: number;
};
