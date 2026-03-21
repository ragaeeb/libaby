import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageLayout } from "@/components/page-layout";
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
import { ShamelaContent, getShamelaSearchText } from "@/lib/shamela-content";
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
      terms.every((t) => getShamelaSearchText(p.content).includes(t)),
    );
  }, [pages, searchQuery]);

  const columns = useMemo<ColumnDef<PageRow>[]>(
    () => [
      {
        accessorKey: "part",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 px-2"
          >
            Volume <ArrowUpDown className="ml-1.5 size-3.5" />
          </Button>
        ),
        cell: ({ row }) => {
          const v = row.getValue("part");
          return v ? (
            <span className="font-mono text-sm tabular-nums">{String(v)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        accessorKey: "pageNumber",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-8 px-2"
          >
            Page <ArrowUpDown className="ml-1.5 size-3.5" />
          </Button>
        ),
        cell: ({ row }) => {
          const v = row.getValue("pageNumber");
          return v ? (
            <span className="font-mono text-sm tabular-nums">{String(v)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        accessorKey: "content",
        header: () => (
          <div className="text-right text-sm font-medium text-foreground">المحتوى</div>
        ),
        cell: ({ row }) => {
          const content = String(row.getValue("content") || "");
          if (!content) return <span className="text-muted-foreground text-sm">No content</span>;

          return (
            <div className="whitespace-normal py-1.5">
              <ShamelaContent content={content} compact previewBlocks={4} showFootnotes={false} />
            </div>
          );
        },
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
    initialState: { pagination: { pageSize: 20 } },
  });

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-3 p-6">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Loading book content…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={() => useBookContentStore.getState().reset()}>
          Retry
        </Button>
      </div>
    );
  }

  const searchActions = (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <div className="relative flex-1 sm:w-64">
        <Input
          dir="rtl"
          placeholder="ابحث في الكتاب..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-8"
          aria-label="Search pages"
        />
        {searchQuery.trim() && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <PageLayout
      title="Book Pages"
      description={`${filteredPages.length.toLocaleString()} page${filteredPages.length !== 1 ? "s" : ""}${searchQuery ? " matching search" : ""}`}
      actions={searchActions}
    >
      <div className="min-w-0 rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={
                      header.column.id === "part" || header.column.id === "pageNumber"
                        ? { width: "80px" }
                        : undefined
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
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
                  className="cursor-pointer align-top"
                  onClick={() =>
                    onNavigate({ page: "shamela-book-page", bookId, pageId: row.original.id })
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        cell.column.id === "content"
                          ? "whitespace-normal align-top"
                          : "align-top"
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
