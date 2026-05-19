import { BookOpen, Download, Languages, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { DenormalizedBook } from "@/types/books";
import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { loadBookResource } from "@/lib/book-resource-store";
import {
  downloadAndCacheBookTranslation,
  isBookTranslationCached,
} from "@/lib/book-translation";
import { getMasterBook, isBookDownloaded } from "@/lib/huggingface";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { Route } from "@/components/application-shell1";

const TRANSLATION_PATH_PREFIX = "books/en/";

export function BookDetailPage({
  bookId,
  onNavigate,
  onBookResolved,
}: {
  bookId: number;
  onNavigate: (r: Route) => void;
  onBookResolved?: (bookId: number, title: string) => void;
}) {
  const token = useSettingsStore((s) => s.huggingfaceToken);
  const dataset = useSettingsStore((s) => s.shamelaDataset);

  const [book, setBook] = useState<DenormalizedBook | null>(null);
  const [loadingBook, setLoadingBook] = useState(true);
  const [cached, setCached] = useState<boolean | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [translationCached, setTranslationCached] = useState<boolean | null>(null);
  const [downloadingTranslation, setDownloadingTranslation] = useState(false);
  const [translationAvailable, setTranslationAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoadingBook(true);
    setDownloadError(null);

    Promise.all([getMasterBook(bookId), isBookDownloaded(bookId), isBookTranslationCached(bookId)])
      .then(([bookData, downloaded, translationCachedResult]) => {
        if (cancelled) return;

        setBook(bookData);
        setCached(downloaded);
        setTranslationCached(translationCachedResult);
        setLoadingBook(false);

        if (bookData?.name) {
          onBookResolved?.(bookId, bookData.en_name ?? bookData.name);
        }

        // Only check HF availability if not already cached
        if (!translationCachedResult) {
          import("@huggingface/hub").then(({ fileExists }) =>
            fileExists({
              credentials: { accessToken: token },
              path: `${TRANSLATION_PATH_PREFIX}${bookId}.json.br`,
              repo: { name: dataset, type: "dataset" },
            })
          ).then(setTranslationAvailable).catch(() => setTranslationAvailable(false));
        } else {
          setTranslationAvailable(true);
        }
      })
      .catch((error) => {
        if (cancelled) return;

        setLoadingBook(false);
        setDownloadError(error instanceof Error ? error.message : "Failed to load book");
      });

    return () => {
      cancelled = true;
    };
  }, [bookId, onBookResolved]);

  const handleDownloadTranslation = useCallback(async () => {
    setDownloadingTranslation(true);
    setDownloadError(null);
    try {
      await downloadAndCacheBookTranslation(token, dataset, bookId);
      setTranslationCached(true);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Translation download failed");
    } finally {
      setDownloadingTranslation(false);
    }
  }, [bookId, dataset, token]);

  const handleDownload = useCallback(async () => {
    if (!book) return;

    setDownloading(true);
    setDownloadError(null);

    try {
      await loadBookResource({
        bookId,
        token,
        dataset,
        title: book.name,
        allowDownload: true,
      });
      setCached(true);
      window.dispatchEvent(
        new CustomEvent("shamela-book-downloaded", {
          detail: { bookId, title: book.name },
        }),
      );
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }, [book, bookId, dataset, token]);

  if (loadingBook) {
    return (
      <div className="flex flex-1 items-center justify-center gap-3 p-6">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading book details…</p>
      </div>
    );
  }

  if (!book) {
    return (
      <PageLayout title="Book Detail">
        <p className="text-sm text-muted-foreground">Book not found in the master database.</p>
      </PageLayout>
    );
  }

  const actions = (
    <>
      {cached && (
        <Button
          variant="outline"
          onClick={() =>
            onNavigate({
              page: "shamela-book-pages",
              bookId,
              bookTitle: book.en_name ?? book.name,
              bookArTitle: book.name,
            })
          }
        >
          <BookOpen className="mr-2 size-4" />
          View Pages
        </Button>
      )}
      {translationAvailable && !translationCached && (
        <Button
          variant="outline"
          onClick={handleDownloadTranslation}
          disabled={downloadingTranslation}
        >
          {downloadingTranslation ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Languages className="mr-2 size-4" />
          )}
          {downloadingTranslation ? "Downloading…" : "Download Translation"}
        </Button>
      )}
      {translationCached && (
        <Button variant="outline" disabled>
          <Languages className="mr-2 size-4" />
          Translation Downloaded
        </Button>
      )}
      <Button onClick={handleDownload} disabled={downloading || !!cached}>
        {downloading ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Download className="mr-2 size-4" />
        )}
        {downloading ? "Downloading…" : cached ? "Downloaded" : "Download Book"}
      </Button>
    </>
  );

  return (
    <PageLayout title="" actions={actions}>
      <div className="min-w-0 space-y-2 rounded-lg border bg-card p-6">
        {/* English title (primary) */}
        {book.en_name && (
          <h2 className="break-words text-2xl font-bold leading-snug tracking-tight">
            {book.en_name}
          </h2>
        )}

        {/* Arabic title */}
        <h2
          className={`break-words text-right leading-snug tracking-tight ${
            book.en_name
              ? "text-lg font-medium text-muted-foreground"
              : "text-2xl font-bold"
          }`}
          dir="rtl"
        >
          {book.name}
        </h2>

        {/* Author */}
        {book.author?.name && (
          <div className="space-y-0.5 pt-1">
            {book.en_author && (
              <p className="text-lg text-muted-foreground">{book.en_author}</p>
            )}
            <p
              className={`text-right text-muted-foreground ${
                book.en_author ? "text-sm" : "text-lg"
              }`}
              dir="rtl"
            >
              {book.author.name}
              {book.author.death ? ` (ت ${book.author.death} هـ)` : ""}
            </p>
          </div>
        )}

        {/* Category */}
        {book.category?.name && (
          <div className="flex items-center gap-2 pt-0.5">
            {book.en_category && (
              <span className="text-sm text-muted-foreground">{book.en_category}</span>
            )}
            {book.en_category && (
              <span className="text-muted-foreground/40">·</span>
            )}
            <span className="text-sm text-muted-foreground" dir="rtl">
              {book.category.name}
            </span>
          </div>
        )}

        {/* Bibliography */}
        {book.bibliography && (
          <p
            className="whitespace-pre-line text-right text-sm leading-relaxed text-muted-foreground/80 pt-2"
            dir="rtl"
          >
            {book.bibliography}
          </p>
        )}
      </div>

      {downloadError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {downloadError}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1 rounded-lg border p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Book ID
          </p>
          <p className="text-2xl font-bold tabular-nums">{book.id}</p>
        </div>
        <div className="space-y-1 rounded-lg border p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Printed
          </p>
          <p className="text-2xl font-bold">{book.printed === 1 ? "Yes" : "No"}</p>
        </div>
        <div className="space-y-1 rounded-lg border p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Version
          </p>
          <p className="text-2xl font-bold tabular-nums">{book.version}</p>
        </div>
      </div>

      {cached === null && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Checking local cache…</span>
        </div>
      )}
    </PageLayout>
  );
}
