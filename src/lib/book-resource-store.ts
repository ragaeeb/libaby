import type { BookData } from "@/types/books";
import { buildBookResource, createBookResourceCache, type BookResource } from "./book-resource";
import { downloadAndCacheBookText, readCachedBookText } from "./huggingface";

type LoadBookResourceOptions = {
  bookId: number;
  token: string;
  dataset: string;
  title?: string;
  allowDownload?: boolean;
};

const pendingLoads = new Map<number, LoadBookResourceOptions>();

const bookResourceCache = createBookResourceCache({
  maxEntries: 6,
  loadBook: async (bookId) => {
    const options = pendingLoads.get(bookId);
    if (!options) {
      throw new Error(`Missing load options for book ${bookId}`);
    }

    const cached = await readCachedBookText(bookId);
    const text =
      cached ??
      (options.allowDownload === false
        ? null
        : await downloadAndCacheBookText(
            options.token,
            options.dataset,
            bookId,
            options.title,
          ));

    if (!text) {
      throw new Error("Book is not available in the local cache");
    }

    return buildBookResource(bookId, JSON.parse(text) as BookData);
  },
});

export async function loadBookResource(
  options: LoadBookResourceOptions,
): Promise<BookResource> {
  pendingLoads.set(options.bookId, options);

  try {
    return await bookResourceCache.get(options.bookId);
  } finally {
    pendingLoads.delete(options.bookId);
  }
}

export function peekBookResource(bookId: number) {
  return bookResourceCache.peek(bookId);
}
