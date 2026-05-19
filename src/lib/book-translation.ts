import { invoke } from "@tauri-apps/api/core";

/** One translated excerpt — mirrors the EnExcerpt shape from master_en / book translation files */
export type EnExcerpt = {
  /** HF id like "B1", "A55", "C23" — unused in per-book files, but present */
  id?: string;
  /** Arabic source text (substring of the page content) */
  nass: string;
  /** English translation */
  text?: string;
  /** pages.id this excerpt starts from */
  from: number;
  /** pages.id this excerpt ends on (inclusive); defaults to `from` if absent */
  to?: number;
};

/** Shape of books/en/{bookId}.json — same contract as master_en.json */
export type BookTranslation = {
  excerpts: EnExcerpt[];
  headings?: EnExcerpt[];
  footnotes?: EnExcerpt[];
};

/** Map of page-id → excerpts that cover it */
export type TranslationIndex = Map<number, EnExcerpt[]>;

/** Build a lookup: pageId → all excerpts that cover that page */
export function buildTranslationIndex(translation: BookTranslation): TranslationIndex {
  const index: TranslationIndex = new Map();

  for (const excerpt of translation.excerpts) {
    if (!excerpt.text) continue;
    const start = excerpt.from;
    const end = excerpt.to ?? excerpt.from;
    for (let pageId = start; pageId <= end; pageId++) {
      const bucket = index.get(pageId);
      if (bucket) {
        bucket.push(excerpt);
      } else {
        index.set(pageId, [excerpt]);
      }
    }
  }

  return index;
}

// ---------------------------------------------------------------------------
// Tauri command wrappers
// ---------------------------------------------------------------------------

export async function isBookTranslationCached(bookId: number): Promise<boolean> {
  try {
    return await invoke<boolean>("is_book_translation_cached", { bookId });
  } catch {
    return false;
  }
}

export async function downloadAndCacheBookTranslation(
  token: string,
  dataset: string,
  bookId: number,
): Promise<void> {
  return invoke("download_and_cache_book_translation", { bookId, dataset, token });
}

export async function readCachedBookTranslation(bookId: number): Promise<BookTranslation | null> {
  const text = await invoke<string | null>("read_cached_book_translation_if_exists", { bookId });
  if (!text) return null;
  return JSON.parse(text) as BookTranslation;
}

// ---------------------------------------------------------------------------
// Simple in-memory cache (per session, max 6 books)
// ---------------------------------------------------------------------------

const MAX_ENTRIES = 6;
const translationCache = new Map<number, TranslationIndex>();

function touchCache(bookId: number, index: TranslationIndex) {
  translationCache.delete(bookId);
  translationCache.set(bookId, index);
  while (translationCache.size > MAX_ENTRIES) {
    const oldest = translationCache.keys().next().value;
    if (oldest !== undefined) translationCache.delete(oldest);
  }
}

export async function loadBookTranslationIndex(
  bookId: number,
): Promise<TranslationIndex | null> {
  const cached = translationCache.get(bookId);
  if (cached) {
    touchCache(bookId, cached);
    return cached;
  }

  const translation = await readCachedBookTranslation(bookId);
  if (!translation) return null;

  const index = buildTranslationIndex(translation);
  touchCache(bookId, index);
  return index;
}
