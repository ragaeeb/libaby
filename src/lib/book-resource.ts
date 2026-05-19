import type { BookData } from "shamela";
import { convertContentToMarkdown, mapPageCharacterContent } from "shamela/content";
import { buildShamelaTitleTree, sanitizeShamelaText, type ShamelaTitleNode } from "./shamela-tree";

export type BookPageRow = {
  id: number;
  content: string;
  pageNumber?: string;
  part?: string;
  previewText: string;
  searchText: string;
};

export type BookResource = {
  bookId: number;
  data: BookData;
  pageRows: BookPageRow[];
  pageIndexById: Map<number, number>;
  pageById: Map<number, BookData["pages"][number]>;
  titleTree: ShamelaTitleNode[];
};

type CreateBookResourceCacheOptions = {
  loadBook: (bookId: number) => Promise<BookResource>;
  maxEntries?: number;
};

function normalizeContentText(content: string) {
  const markdown = convertContentToMarkdown(mapPageCharacterContent(content));
  return sanitizeShamelaText(markdown);
}

function buildPreviewText(content: string) {
  return normalizeContentText(content);
}

function buildSearchText(content: string) {
  return normalizeContentText(content).toLowerCase();
}

export function buildBookResource(
  bookId: number,
  data: BookData,
): BookResource {
  const pageRows = data.pages
    .filter((page) => !page.content.includes("is_deleted"))
    .map((page) => ({
      id: page.id,
      content: page.content,
      pageNumber: page.number || page.page?.toString(),
      part: page.part || undefined,
      previewText: buildPreviewText(page.content),
      searchText: buildSearchText(page.content),
    }));

  const pageIndexById = new Map<number, number>();
  const pageById = new Map<number, BookData["pages"][number]>();

  for (const [index, row] of pageRows.entries()) {
    pageIndexById.set(row.id, index);
  }

  for (const page of data.pages) {
    pageById.set(page.id, page);
  }

  return {
    bookId,
    data,
    pageRows,
    pageIndexById,
    pageById,
    titleTree: buildShamelaTitleTree(data.titles, data.pages),
  };
}

export function filterPageRows(
  pageRows: BookPageRow[],
  query: string,
) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return pageRows;
  }

  return pageRows.filter((row) =>
    terms.every((term) => row.searchText.includes(term)),
  );
}

export function createBookResourceCache({
  loadBook,
  maxEntries = 6,
}: CreateBookResourceCacheOptions) {
  const cache = new Map<number, BookResource>();
  const inflight = new Map<number, Promise<BookResource>>();

  function touch(bookId: number, resource: BookResource) {
    cache.delete(bookId);
    cache.set(bookId, resource);

    while (cache.size > maxEntries) {
      const oldestBookId = cache.keys().next().value;
      if (oldestBookId === undefined) {
        break;
      }
      cache.delete(oldestBookId);
    }
  }

  return {
    clear() {
      cache.clear();
      inflight.clear();
    },

    async get(bookId: number) {
      const cached = cache.get(bookId);
      if (cached) {
        touch(bookId, cached);
        return cached;
      }

      const existing = inflight.get(bookId);
      if (existing) {
        return existing;
      }

      const pending = loadBook(bookId)
        .then((resource) => {
          touch(bookId, resource);
          inflight.delete(bookId);
          return resource;
        })
        .catch((error) => {
          inflight.delete(bookId);
          throw error;
        });

      inflight.set(bookId, pending);
      return pending;
    },

    peek(bookId: number) {
      return cache.get(bookId) ?? null;
    },
  };
}
