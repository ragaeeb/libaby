import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { downloadBookData, loadCachedBook } from "@/lib/huggingface";
import { useBookContentStore } from "@/stores/useBookContentStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { Page } from "@/types/books";
import type { Route } from "@/components/application-shell1";

const extractTitles = (content: string): { body: string; titles: string[] } => {
  const cleaned = content.replace(/\r/g, "\n");
  const titles: string[] = [];
  const titleRegex = /<span[^>]*data-type="title"[^>]*>\[([^\]]+)\]\s*\[?<\/span>/g;
  for (const match of cleaned.matchAll(titleRegex)) {
    titles.push(match[1]);
  }
  const body = cleaned.replace(/<span[^>]*data-type="title"[^>]*>.*?<\/span>/g, "").trim();
  return { body, titles };
};

function renderPageContent(content: string) {
  const parts = content.split("_________");
  const mainContent = parts[0].replace(/\r/g, "\n");
  const { body, titles } = extractTitles(mainContent);

  const bodyParts = body.split("\n").map((p) => p.trim()).filter((p) => p.length > 0);
  const footnotes = parts.slice(1).map((f) => f.replace(/\r/g, "\n").trim());

  return (
    <div className="space-y-8">
      {titles.length > 0 && (
        <div className="space-y-3">
          {titles.map((title) => (
            <div key={title} className="rounded-lg bg-primary/10 px-6 py-4 text-right">
              <h2 className="font-bold text-2xl" dir="rtl">{title}</h2>
            </div>
          ))}
        </div>
      )}

      <div className="prose prose-lg max-w-none" dir="rtl">
        {bodyParts.map((part) => (
          <p key={part} className="mb-4 text-right leading-relaxed">{part}</p>
        ))}
      </div>

      {footnotes.length > 0 && (
        <div className="border-t pt-8">
          <h3 className="mb-4 font-semibold text-lg">Footnotes</h3>
          <div className="prose prose-sm max-w-none" dir="rtl">
            {footnotes.map((footnote) => (
              <div key={footnote} className="mb-4 text-right text-muted-foreground leading-relaxed">{footnote}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading page...</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <p className="text-muted-foreground">Page not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={!prevPageId}
          onClick={() =>
            prevPageId && onNavigate({ page: "shamela-book-page", bookId, pageId: prevPageId })
          }
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous Page
        </Button>

        <div className="text-center">
          <div className="text-muted-foreground text-sm">
            {page.part && `Part ${page.part} · `}
            Page {page.number || page.id}
          </div>
        </div>

        <Button
          variant="outline"
          disabled={!nextPageId}
          onClick={() =>
            nextPageId && onNavigate({ page: "shamela-book-page", bookId, pageId: nextPageId })
          }
        >
          Next Page
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-8">{renderPageContent(page.content)}</div>
    </div>
  );
}
