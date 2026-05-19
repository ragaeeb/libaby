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
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
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
import { type BookPageRow, filterPageRows } from "@/lib/book-resource";
import { loadBookResource } from "@/lib/book-resource-store";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { Route } from "@/components/application-shell1";

export function BookPagesPage({
  bookId,
  onNavigate,
}: { bookId: number; onNavigate: (r: Route) => void }) {
  const token = useSettingsStore((s) => s.huggingfaceToken);
  const dataset = useSettingsStore((s) => s.shamelaDataset);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageRows, setPageRows] = useState<BookPageRow[]>([]);

  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    loadBookResource({
      bookId,
      token,
      dataset,
      allowDownload: true,
    })
      .then((resource) => {
        if (cancelled) return;
        setPageRows(resource.pageRows);
        setLoading(false);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load book");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookId, dataset, token]);

  const filteredPages = useMemo(
    () => filterPageRows(pageRows, deferredSearchQuery),
    [deferredSearchQuery, pageRows],
  );

  const columns = useMemo<ColumnDef<BookPageRow>[]>(
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
          const value = row.getValue("part");
          return value ? (
            <span className="font-mono text-sm tabular-nums">{String(value)}</span>
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
          const value = row.getValue("pageNumber");
          return value ? (
            <span className="font-mono text-sm tabular-nums">{String(value)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        accessorKey: "previewText",
        header: () => <div className="text-right text-sm font-medium text-foreground">المحتوى</div>,
        cell: ({ row }) => (
          <p className="line-clamp-4 whitespace-normal text-right text-sm leading-7" dir="rtl">
            {String(row.getValue("previewText"))}
          </p>
        ),
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
          onChange={(event) => {
            const value = event.target.value;
            startTransition(() => {
              setSearchQuery(value);
            });
          }}
          className="pr-8"
          aria-label="Search pages"
        />
        {searchQuery.trim() && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
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
      description={`${filteredPages.length.toLocaleString()} page${filteredPages.length !== 1 ? "s" : ""}${deferredSearchQuery ? " matching search" : ""}`}
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
                    onNavigate({
                      page: "shamela-book-page",
                      bookId,
                      pageId: row.original.id,
                      pageNumber: row.original.pageNumber,
                    })
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        cell.column.id === "previewText"
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
