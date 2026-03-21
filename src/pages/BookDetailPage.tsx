import { BookOpen, Download, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { downloadBookData, loadCachedBook } from "@/lib/huggingface";
import { useBooksStore } from "@/stores/useBooksStore";
import { useBookContentStore } from "@/stores/useBookContentStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { Route } from "@/components/application-shell1";

export function BookDetailPage({
  bookId,
  onNavigate,
}: { bookId: number; onNavigate: (r: Route) => void }) {
  const books = useBooksStore((s) => s.books);
  const token = useSettingsStore((s) => s.huggingfaceToken);
  const dataset = useSettingsStore((s) => s.shamelaDataset);
  const setBookContent = useBookContentStore((s) => s.setData);

  const book = books.find((b) => b.id === bookId);

  const [cached, setCached] = useState<boolean | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    loadCachedBook(bookId).then((data) => {
      if (data) {
        setCached(true);
        setBookContent(bookId, data);
      } else {
        setCached(false);
      }
    });
  }, [bookId, setBookContent]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const data = await downloadBookData(token, dataset, bookId);
      setBookContent(bookId, data);
      setCached(true);
      window.dispatchEvent(new CustomEvent("shamela-book-downloaded", { detail: { bookId } }));
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "Download failed");
    }
    setDownloading(false);
  }, [token, dataset, bookId, setBookContent]);

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
          onClick={() => onNavigate({ page: "shamela-book-pages", bookId })}
        >
          <BookOpen className="mr-2 size-4" />
          View Pages
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
      {/* Book title and meta — RTL hero section */}
      <div className="min-w-0 space-y-2 rounded-lg border bg-card p-6">
        <h2
          className="break-words text-right text-2xl font-bold leading-snug tracking-tight"
          dir="rtl"
        >
          {book.name}
        </h2>

        {book.author?.name && (
          <p className="text-right text-lg text-muted-foreground" dir="rtl">
            {book.author.name}
            {book.author.death ? ` (ت ${book.author.death} هـ)` : ""}
          </p>
        )}

        {book.category?.name && (
          <p className="text-right text-sm text-muted-foreground" dir="rtl">
            {book.category.name}
          </p>
        )}

        {book.bibliography && (
          <p
            className="whitespace-pre-line text-right text-sm leading-relaxed text-muted-foreground/80"
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
