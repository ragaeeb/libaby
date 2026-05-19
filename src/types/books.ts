import type { BookData, DenormalizedBook as BaseDenormalizedBook, Page, Title } from "shamela";

/** DenormalizedBook with English translations injected by Rust at index-build time */
export type DenormalizedBook = BaseDenormalizedBook & {
  en_name?: string;
  en_author?: string;
  en_category?: string;
};

export type { BookData, Page, Title };

export type MasterArchive = {
  timestamp: number;
  books: DenormalizedBook[];
  version: number;
};
