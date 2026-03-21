import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { downloadBookData, loadCachedBook } from "@/lib/huggingface";
import { ShamelaContent } from "@/lib/shamela-content";
import { useBookContentStore } from "@/stores/useBookContentStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { Page } from "@/types/books";
import type { Route } from "@/components/application-shell1";

export function BookPageView({
  bookId,
  pageId,
  onNavigate,
}: { bookId: number; pageId: number; onNavigate: (r: Route) => void }) {
  const token = useSettingsStore((s) => s.huggingfaceToken);
  const dataset = useSettingsStore((s) => s.shamelaDataset);
  const storeBookId = useBookContentStore((s) => s.bookId);
  const storeData = useBookContentStore((s) => s.data);
  const setData = useBookContentStore((s) => s.setData);

  const [loading, setLoading] = useState(true);

  const bookData = storeBookId === bookId ? storeData : null;

  useEffect(() => {
    if (storeBookId === bookId && storeData) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const cached = await loadCachedBook(bookId);
        if (cached) {
          setData(bookId, cached);
        } else {
          const data = await downloadBookData(token, dataset, bookId);
          setData(bookId, data);
        }
      } catch {
        // error handled by store
      }
      setLoading(false);
    };

    load();
  }, [bookId, storeBookId, storeData, token, dataset, setData]);

  const page = useMemo<Page | null>(() => {
    if (!bookData) return null;
    return bookData.pages.find((p) => p.id === pageId) ?? null;
  }, [bookData, pageId]);

  const { prevPageId, nextPageId } = useMemo(() => {
    if (!bookData) return { prevPageId: null, nextPageId: null };
    const idx = bookData.pages.findIndex((p) => p.id === pageId);
    return {
      prevPageId: idx > 0 ? bookData.pages[idx - 1].id : null,
      nextPageId: idx < bookData.pages.length - 1 ? bookData.pages[idx + 1].id : null,
    };
  }, [bookData, pageId]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-3 p-6">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading page…</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <p className="text-sm text-muted-foreground">Page not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Navigation bar */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          size="sm"
          disabled={!prevPageId}
          onClick={() =>
            prevPageId &&
            onNavigate({ page: "shamela-book-page", bookId, pageId: prevPageId })
          }
          aria-label="Previous page"
        >
          <ChevronLeft className="mr-1 size-4" />
          Previous
        </Button>

        <span className="text-sm text-muted-foreground tabular-nums">
          {page.part ? `Part ${page.part} · ` : ""}
          Page {page.number || page.id}
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={!nextPageId}
          onClick={() =>
            nextPageId &&
            onNavigate({ page: "shamela-book-page", bookId, pageId: nextPageId })
          }
          aria-label="Next page"
        >
          Next
          <ChevronRight className="ml-1 size-4" />
        </Button>
      </div>

      {/* Page content */}
      <div className="min-w-0 rounded-lg border bg-card px-8 py-6">
        <ShamelaContent content={page.content} />
      </div>
    </div>
  );
}
