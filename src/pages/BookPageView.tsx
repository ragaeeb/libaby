import { Check, ChevronLeft, ChevronRight, ClipboardCopy, Languages, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { loadBookResource } from "@/lib/book-resource-store";
import type { EnExcerpt, TranslationIndex } from "@/lib/book-translation";
import { loadBookTranslationIndex } from "@/lib/book-translation";
import { getMasterBook } from "@/lib/huggingface";
import { ShamelaContent } from "@/lib/shamela-content";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { Route } from "@/components/application-shell1";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BookMeta = {
  bookId: number;
  enTitle?: string;
  arTitle?: string;
  enAuthor?: string;
  arAuthor?: string;
};

// ---------------------------------------------------------------------------
// Citation builder
// ---------------------------------------------------------------------------

function buildCitation(
  excerpts: EnExcerpt[],
  meta: BookMeta,
  part: string | number | undefined,
  pageNumber: string | number | undefined,
  pageId: number,
): string {
  const toArabicNumerals = (n: string | number) =>
    String(n).replace(/\d/g, (d) => "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669"[parseInt(d)]);

  const enPart = part != null ? String(part) : null;
  const enPage = pageNumber != null ? String(pageNumber) : String(pageId);
  const arPart = part != null ? toArabicNumerals(part) : null;
  const arPage = pageNumber != null ? toArabicNumerals(pageNumber) : toArabicNumerals(pageId);

  // "part/page" refs
  const enRef = enPart ? `${enPart}/${enPage}` : enPage;
  const arRef = arPart ? `${arPart}/${arPage}` : arPage;

  const enText = excerpts.map((e) => e.text ?? "").filter(Boolean).join("\n\n");
  const arText = excerpts.map((e) => e.nass).filter(Boolean).join("\n\n");

  const lines: string[] = [];

  if (enText) lines.push(enText);
  if (arText) lines.push(arText);
  if (lines.length) lines.push("");

  // English citation: Title, Author, part/page
  const enParts = [meta.enTitle, meta.enAuthor, enRef].filter(Boolean);
  if (enParts.length) lines.push(enParts.join(", "));

  // Arabic citation: Title، Author، arabic-ref
  const arParts = [meta.arTitle, meta.arAuthor, arRef].filter(Boolean);
  if (arParts.length) lines.push(arParts.join("، "));

  lines.push(`https://shamela.ws/book/${meta.bookId}/${pageId}`);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Copy button with tick feedback
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className={`h-7 gap-1.5 px-2 text-xs transition-colors ${
        copied
          ? "text-teal-500 hover:text-teal-500"
          : "text-muted-foreground hover:text-foreground"
      }`}
      title="Copy with citation"
    >
      {copied ? (
        <>
          <Check className="size-3.5" />
          Copied!
        </>
      ) : (
        <>
          <ClipboardCopy className="size-3.5" />
          Copy
        </>
      )}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Excerpt block
// ---------------------------------------------------------------------------

function ExcerptBlock({ excerpt }: { excerpt: EnExcerpt }) {
  return (
    <div className="space-y-2">
      <p className="whitespace-pre-line text-sm leading-7 text-foreground/90">{excerpt.text}</p>
      {excerpt.nass && (
        <p
          className="whitespace-pre-line border-r-2 border-primary/30 pr-3 text-right text-xs leading-6 text-muted-foreground/60"
          dir="rtl"
        >
          {excerpt.nass}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BookPageView({
  bookId,
  pageId,
  onNavigate,
  bookMeta,
}: {
  bookId: number;
  pageId: number;
  onNavigate: (r: Route) => void;
  bookMeta?: BookMeta;
}) {
  const token = useSettingsStore((s) => s.huggingfaceToken);
  const dataset = useSettingsStore((s) => s.shamelaDataset);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageIds, setPageIds] = useState<number[]>([]);
  const [pageIndexById, setPageIndexById] = useState<Map<number, number>>(new Map());
  const [page, setPage] = useState<ReturnType<typeof loadBookPageState> | null>(null);
  const [translationIndex, setTranslationIndex] = useState<TranslationIndex | null>(null);
  const [showTranslation, setShowTranslation] = useState(true);
  // Author/title info from master for the citation — loaded once per bookId
  const [masterMeta, setMasterMeta] = useState<BookMeta | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    // Reset translation on page/book change so stale data is never shown
    setTranslationIndex(null);

    loadBookResource({ bookId, token, dataset, allowDownload: true })
      .then((resource) => {
        if (cancelled) return;
        setPage(loadBookPageState(resource, pageId));
        setPageIds(resource.pageRows.map((row) => row.id));
        setPageIndexById(resource.pageIndexById);
        setLoading(false);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load page");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookId, dataset, pageId, token]);

  // Load translation independently — keyed only on bookId, not pageId,
  // so navigating between pages of the same book doesn't reload it.
  useEffect(() => {
    let cancelled = false;
    loadBookTranslationIndex(bookId).then((idx) => {
      if (!cancelled) setTranslationIndex(idx);
    });
    return () => { cancelled = true; };
  }, [bookId]);

  // Load master book meta (author names, titles) for citation — once per bookId.
  useEffect(() => {
    let cancelled = false;
    getMasterBook(bookId).then((book) => {
      if (cancelled || !book) return;
      setMasterMeta({
        bookId,
        enTitle: book.en_name ?? book.name,
        arTitle: book.name,
        enAuthor: book.en_author ?? book.author?.name,
        arAuthor: book.author?.name,
      });
    });
    return () => { cancelled = true; };
  }, [bookId]);

  const { prevPageId, nextPageId } = useMemo(() => {
    const pageIndex = pageIndexById.get(pageId) ?? -1;
    return {
      prevPageId: pageIndex > 0 ? pageIds[pageIndex - 1] : null,
      nextPageId:
        pageIndex >= 0 && pageIndex < pageIds.length - 1 ? pageIds[pageIndex + 1] : null,
    };
  }, [pageId, pageIds, pageIndexById]);

  const excerpts = useMemo<EnExcerpt[]>(
    () => (translationIndex ? (translationIndex.get(pageId) ?? []) : []),
    [translationIndex, pageId],
  );

  const hasTranslation = translationIndex !== null && excerpts.length > 0;

  // Human-readable page number from the book data (may differ from raw pageId)
  const humanPageNumber = page?.number ?? page?.page ?? undefined;

  // Merge: master-loaded meta takes priority over prop (which may lack author info)
  const effectiveMeta = useMemo<BookMeta>(() => ({
    bookId,
    enTitle: masterMeta?.enTitle ?? bookMeta?.enTitle ?? "",
    arTitle: masterMeta?.arTitle ?? bookMeta?.arTitle ?? "",
    enAuthor: masterMeta?.enAuthor ?? bookMeta?.enAuthor,
    arAuthor: masterMeta?.arAuthor ?? bookMeta?.arAuthor,
  }), [bookId, bookMeta, masterMeta]);

  // Stable primitives from effectiveMeta to avoid invalidating citationText on every parent render
  const enTitle = effectiveMeta.enTitle;
  const arTitle = effectiveMeta.arTitle;
  const enAuthor = effectiveMeta.enAuthor ?? "";
  const arAuthor = effectiveMeta.arAuthor ?? "";
  const metaBookId = effectiveMeta.bookId;

  // Citation text — deps are all stable primitives, not object references
  const citationText = useMemo(() => {
    if (!hasTranslation || !excerpts.length) return "";
    return buildCitation(
      excerpts,
      { bookId: metaBookId, enTitle, arTitle, enAuthor, arAuthor },
      page?.part,
      humanPageNumber,
      pageId,
    );
  }, [arAuthor, arTitle, enAuthor, enTitle, excerpts, hasTranslation, humanPageNumber, metaBookId, page?.part, pageId]);

  // Navigate helper: attach human page number so breadcrumb shows it
  const navigateTo = (id: number) =>
    onNavigate({ page: "shamela-book-page", bookId, pageId: id });

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-3 p-6">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading page…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <p className="text-sm text-destructive">{error}</p>
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
          onClick={() => prevPageId && navigateTo(prevPageId)}
          aria-label="Previous page"
        >
          <ChevronLeft className="mr-1 size-4" />
          Previous
        </Button>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground tabular-nums">
            {page.part ? `Part ${page.part} · ` : ""}
            Page {humanPageNumber ?? pageId}
          </span>
          {translationIndex !== null && (
            <Button
              variant={showTranslation ? "default" : "outline"}
              size="sm"
              onClick={() => setShowTranslation((v) => !v)}
              title={showTranslation ? "Hide translation" : "Show translation"}
            >
              <Languages className="mr-1.5 size-4" />
              {showTranslation ? "Translation On" : "Translation Off"}
            </Button>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={!nextPageId}
          onClick={() => nextPageId && navigateTo(nextPageId)}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="ml-1 size-4" />
        </Button>
      </div>

      {/* Content */}
      {hasTranslation && showTranslation ? (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Arabic */}
          <div className="order-2 min-w-0 rounded-lg border bg-card px-8 py-6 md:order-1">
            <ShamelaContent content={page.content} />
          </div>

          {/* English */}
          <div className="order-1 flex min-w-0 flex-col gap-4 rounded-lg border bg-card/60 px-8 py-6 md:order-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                English Translation
              </p>
              <CopyButton text={citationText} />
            </div>
            <div className="flex flex-col gap-6">
              {excerpts.map((excerpt, i) => (
                <ExcerptBlock key={i} excerpt={excerpt} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="min-w-0 rounded-lg border bg-card px-8 py-6">
          <ShamelaContent content={page.content} />
        </div>
      )}
    </div>
  );
}

function loadBookPageState(
  resource: Awaited<ReturnType<typeof loadBookResource>>,
  pageId: number,
) {
  return resource.pageById.get(pageId) ?? null;
}
