import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadBookData, loadCachedBook } from "@/lib/huggingface";
import { useBookContentStore } from "@/stores/useBookContentStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { Page } from "@/types/books";
import type { Route } from "@/components/application-shell1";

type PageRow = {
  id: number;
  content: string;
  pageNumber?: string;
  part?: string;
};

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

function toPageRow(p: Page): PageRow {
  return {
    id: p.id,
    content: p.content,
    pageNumber: p.number || p.page?.toString(),
    part: p.part || undefined,
  };
}

export function BookPagesPage({
  bookId,
  onNavigate,
}: { bookId: number; onNavigate: (r: Route) => void }) {
  const token = useSettingsStore((s) => s.huggingfaceToken);
  const dataset = useSettingsStore((s) => s.shamelaDataset);
  const storeBookId = useBookContentStore((s) => s.bookId);
  const storeData = useBookContentStore((s) => s.data);
  const loading = useBookContentStore((s) => s.loading);
  const error = useBookContentStore((s) => s.error);
  const setData = useBookContentStore((s) => s.setData);
  const setLoading = useBookContentStore((s) => s.setLoading);
  const setError = useBookContentStore((s) => s.setError);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const bookData = storeBookId === bookId ? storeData : null;

  useEffect(() => {
    if (storeBookId === bookId && storeData) return;
    if (loading) return;

    const load = async () => {
      setLoading(true);
      try {
        const cached = await loadCachedBook(bookId);
        if (cached) {
          setData(bookId, cached);
          return;
        }
        const data = await downloadBookData(token, dataset, bookId);
        setData(bookId, data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load book");
      }
    };

    load();
  }, [bookId, storeBookId, storeData, loading, token, dataset, setData, setLoading, setError]);

  const pages = useMemo(() => {
    if (!bookData) return [];
    return bookData.pages
      .filter((p) => !p.content.includes("is_deleted"))
      .map(toPageRow);
  }, [bookData]);

  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return pages;
    const terms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    return pages.filter((p) =>
      terms.every((t) => p.content.toLowerCase().includes(t)),
    );
  }, [pages, searchQuery]);

  const columns = useMemo<ColumnDef<PageRow>[]>(
    () => [
      {
        accessorKey: "part",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-4">
            Volume <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const v = row.getValue("part");
          return v ? <span className="font-mono text-sm">{String(v)}</span> : <span className="text-muted-foreground">—</span>;
        },
        size: 100,
      },
      {
        accessorKey: "pageNumber",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-4">
            Page <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const v = row.getValue("pageNumber");
          return v ? <span className="font-mono text-sm">{String(v)}</span> : <span className="text-muted-foreground">—</span>;
        },
        size: 100,
      },
      {
        accessorKey: "content",
        header: () => <div className="text-right">المحتوى</div>,
        cell: ({ row }) => {
          const content = String(row.getValue("content") || "");
          if (!content) return <span className="text-muted-foreground">No content</span>;

          const mainContent = content.split("_________")[0];
          const { body, titles } = extractTitles(mainContent);
          const lines = body.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
          const previewLines = lines.slice(0, 5);

          return (
            <div className="space-y-2 py-2">
              {titles.length > 0 && (
                <div className="space-y-1">
                  {titles.slice(0, 2).map((title) => (
                    <div key={title} className="rounded bg-primary/10 px-3 py-1.5 text-right font-semibold text-sm">
                      <span dir="rtl">{title}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-1 text-right text-sm leading-relaxed" dir="rtl">
                {previewLines.map((line) => (
                  <div key={line} className="break-words">{line}</div>
                ))}
                {lines.length > 5 && <div className="text-muted-foreground">...</div>}
              </div>
            </div>
          );
        },
        meta: { className: "whitespace-normal" },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredPages,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-3 p-6">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading book content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => useBookContentStore.getState().reset()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="font-bold text-3xl tracking-tight">Book Pages</h1>
          <p className="text-muted-foreground">
            {filteredPages.length} page{filteredPages.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            dir="rtl"
            placeholder="ابحث في الكتاب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-w-[300px]"
          />
          {searchQuery.trim() && (
            <Button variant="outline" onClick={() => setSearchQuery("")}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => onNavigate({ page: "shamela-book-page", bookId, pageId: row.original.id })}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} ({filteredPages.length} page(s))
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
