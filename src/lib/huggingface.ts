import { fileExists } from "@huggingface/hub";
import { invoke } from "@tauri-apps/api/core";
import type { BookData, DenormalizedBook } from "@/types/books";

const MASTER_PATH = "master/master.json.br";

type RawMasterQueryResult = {
  items: DenormalizedBook[];
  page_index: number;
  page_size: number;
  total: number;
  total_all: number;
};

export type DownloadedBookEntry = {
  book_id: number;
  title: string | null;
};

export type MasterQueryOptions = {
  pageIndex: number;
  pageSize: number;
  query: string;
  sortBy?: string;
  sortDesc?: boolean;
};

export type MasterQueryResult = {
  items: DenormalizedBook[];
  pageIndex: number;
  pageSize: number;
  total: number;
  totalAll: number;
};

export async function checkDatasetAccess(token: string, dataset: string): Promise<boolean> {
  try {
    return await fileExists({
      credentials: { accessToken: token },
      path: MASTER_PATH,
      repo: { name: dataset, type: "dataset" },
    });
  } catch {
    return false;
  }
}

export async function validateAccess(
  token: string,
  dataset: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!token.trim()) return { error: "HuggingFace token is required", ok: false };
  if (!dataset.trim()) return { error: "Shamela dataset is required", ok: false };

  const hasAccess = await checkDatasetAccess(token, dataset);
  if (!hasAccess) {
    return {
      error: `Unable to access dataset "${dataset}" or ${MASTER_PATH} not found`,
      ok: false,
    };
  }

  return { ok: true };
}

export async function isMasterCached(): Promise<boolean> {
  return invoke<boolean>("is_master_cached");
}

export async function downloadAndCacheMaster(
  token: string,
  dataset: string,
): Promise<{ books: number }> {
  return invoke<{ books: number }>("download_and_cache_master", { dataset, token });
}

export async function queryMasterBooks(options: MasterQueryOptions): Promise<MasterQueryResult> {
  const result = await invoke<RawMasterQueryResult>("query_master_books", {
    params: {
      page_index: options.pageIndex,
      page_size: options.pageSize,
      query: options.query,
      sort_by: options.sortBy ?? null,
      sort_desc: options.sortDesc ?? false,
    },
  });

  return {
    items: result.items,
    pageIndex: result.page_index,
    pageSize: result.page_size,
    total: result.total,
    totalAll: result.total_all,
  };
}

export async function getMasterBook(bookId: number): Promise<DenormalizedBook | null> {
  return invoke<DenormalizedBook | null>("get_master_book", { bookId });
}

export async function getMasterBooksByIds(bookIds: number[]): Promise<DenormalizedBook[]> {
  return invoke<DenormalizedBook[]>("get_master_books_by_ids", { bookIds });
}

export async function listDownloadedBooks(): Promise<DownloadedBookEntry[]> {
  try {
    return await invoke<DownloadedBookEntry[]>("list_downloaded_books");
  } catch {
    return [];
  }
}

export async function listDownloadedBookIds(): Promise<number[]> {
  try {
    return await invoke<number[]>("list_downloaded_book_ids");
  } catch {
    return [];
  }
}

export async function isBookDownloaded(bookId: number): Promise<boolean> {
  try {
    return await invoke<boolean>("is_book_downloaded", { bookId });
  } catch {
    return false;
  }
}

export async function readCachedBookText(bookId: number): Promise<string | null> {
  try {
    return await invoke<string | null>("read_cached_book_if_exists", { bookId });
  } catch {
    return null;
  }
}

export async function loadCachedBook(bookId: number): Promise<BookData | null> {
  const cached = await readCachedBookText(bookId);
  return cached ? (JSON.parse(cached) as BookData) : null;
}

export async function downloadAndCacheBookText(
  token: string,
  dataset: string,
  bookId: number,
  title?: string,
): Promise<string> {
  return invoke<string>("download_and_cache_book", {
    bookId,
    dataset,
    title: title ?? null,
    token,
  });
}

export async function downloadBookData(
  token: string,
  dataset: string,
  bookId: number,
  title?: string,
): Promise<BookData> {
  const text = await downloadAndCacheBookText(token, dataset, bookId, title);
  return JSON.parse(text) as BookData;
}
