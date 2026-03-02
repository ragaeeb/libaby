import { BookOpen, Download, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "Download failed");
    }
    setDownloading(false);
  }, [token, dataset, bookId, setBookContent]);

  if (!book) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <p className="text-muted-foreground">Book not found in the master database.</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="break-words text-right font-bold text-3xl tracking-tight" dir="rtl">
            {book.name}
          </h2>

          {book.author?.name && (
            <p className="text-right text-muted-foreground text-xl" dir="rtl">
              {book.author.name}
              {book.author.death ? ` (ت ${book.author.death} هـ)` : ""}
            </p>
          )}

          {book.category?.name && (
            <p className="text-right text-muted-foreground" dir="rtl">
              {book.category.name}
            </p>
          )}

          {book.bibliography && (
            <p className="text-right text-sm text-muted-foreground" dir="rtl">
              {book.bibliography}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          {cached && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => onNavigate({ page: "shamela-book-pages", bookId })}
            >
              <BookOpen className="mr-2 h-5 w-5" />
              View Pages
            </Button>
          )}
          <Button size="lg" onClick={handleDownload} disabled={downloading || !!cached}>
            {downloading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {!downloading && <Download className="mr-2 h-5 w-5" />}
            {downloading ? "Downloading..." : cached ? "Downloaded" : "Download Book"}
          </Button>
        </div>
      </div>

      {downloadError && (
        <p className="text-destructive text-sm">{downloadError}</p>
      )}

      <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2 rounded-lg border p-6">
          <p className="font-medium text-muted-foreground text-sm">Book ID</p>
          <p className="font-bold text-3xl">{book.id}</p>
        </div>
        <div className="space-y-2 rounded-lg border p-6">
          <p className="font-medium text-muted-foreground text-sm">Printed</p>
          <p className="font-bold text-3xl">{book.printed === 1 ? "Yes" : "No"}</p>
        </div>
        <div className="space-y-2 rounded-lg border p-6">
          <p className="font-medium text-muted-foreground text-sm">Version</p>
          <p className="font-bold text-3xl">{book.version}</p>
        </div>
      </div>

      {cached === null && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Checking cache...</span>
        </div>
      )}
    </div>
  );
}
