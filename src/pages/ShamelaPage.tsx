import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, Loader2 } from "lucide-react";
import type { DenormalizedBook } from "shamela";
import { useCallback, useEffect, useState } from "react";
import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { loadMasterBooks } from "@/lib/huggingface";
import { useBooksStore } from "@/stores/useBooksStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

function SortableHeader({
  column,
  label,
}: { column: { toggleSorting: (desc?: boolean) => void }; label: string }) {
  return (
    <Button variant="ghost" size="sm" className="-ml-3 h-8 px-2" onClick={() => column.toggleSorting()}>
      {label}
      <ArrowUpDown className="ml-1.5 size-3.5" />
    </Button>
  );
}

const columns: ColumnDef<DenormalizedBook>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        {row.getValue("id")}
      </span>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} label="Title" />,
    cell: ({ row }) => (
      <span
        className="line-clamp-2 block whitespace-normal text-sm font-medium"
        dir="rtl"
        title={String(row.getValue("name"))}
      >
        {row.getValue("name")}
      </span>
    ),
  },
  {
    id: "author",
    accessorFn: (row) => row.author?.name,
    header: ({ column }) => <SortableHeader column={column} label="Author" />,
    cell: ({ row }) => (
      <span
        className="line-clamp-1 block whitespace-normal text-sm"
        dir="rtl"
        title={String(row.getValue("author") ?? "")}
      >
        {row.getValue("author")}
      </span>
    ),
  },
  {
    id: "authorDeath",
    accessorFn: (row) => row.author?.death,
    header: "Death",
    cell: ({ row }) => {
      const death = row.getValue("authorDeath") as number | undefined;
      return death ? (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {death} هـ
        </span>
      ) : null;
    },
  },
  {
    id: "category",
    accessorFn: (row) => row.category?.name,
    header: ({ column }) => <SortableHeader column={column} label="Category" />,
    cell: ({ row }) => (
      <span
        className="line-clamp-1 block whitespace-normal text-sm text-muted-foreground"
        dir="rtl"
      >
        {row.getValue("category")}
      </span>
    ),
  },
  {
    accessorKey: "printed",
    header: "Printed",
    cell: ({ row }) => {
      const v = row.getValue("printed") as number;
      return (
        <span className="text-xs text-muted-foreground">{v === 1 ? "Yes" : "No"}</span>
      );
    },
  },
  {
    accessorKey: "version",
    header: "Version",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.getValue("version")}
      </span>
    ),
  },
];

const defaultVisibility: VisibilityState = {
  id: true,
  name: true,
  author: true,
  authorDeath: false,
  category: true,
  printed: false,
  version: false,
};

const COLUMN_WIDTHS: Record<string, string> = {
  id: "60px",
  name: "auto",
  author: "180px",
  authorDeath: "90px",
  category: "160px",
  printed: "70px",
  version: "70px",
};

export function ShamelaPage({ onBookClick }: { onBookClick?: (bookId: number) => void }) {
  const token = useSettingsStore((s) => s.huggingfaceToken);
  const dataset = useSettingsStore((s) => s.shamelaDataset);
  const books = useBooksStore((s) => s.books);
  const loading = useBooksStore((s) => s.loading);
  const error = useBooksStore((s) => s.error);
  const setBooks = useBooksStore((s) => s.setBooks);
  const setLoading = useBooksStore((s) => s.setLoading);
  const setError = useBooksStore((s) => s.setError);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(defaultVisibility);

  useEffect(() => {
    if (books.length > 0 || loading || error) return;

    const load = async () => {
      setLoading(true);
      try {
        const archive = await loadMasterBooks(token, dataset);
        setBooks(archive.books);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to download books");
      }
    };

    load();
  }, [token, dataset, books.length, loading, error, setBooks, setLoading, setError]);

  const globalFilterFn = useCallback(
    (row: { original: DenormalizedBook }, _columnId: string, filterValue: string) => {
      const terms = filterValue
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 0);
      const fields = [
        row.original.name,
        row.original.author?.name,
        row.original.category?.name,
        row.original.bibliography,
      ].map((f) => f?.toLowerCase() || "");

      return terms.every((term) => fields.some((f) => f.includes(term)));
    },
    [],
  );

  const table = useReactTable({
    data: books,
    columns,
    state: { sorting, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-3 p-6">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Downloading books database…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={() => { useBooksStore.getState().reset(); }}>
          Retry
        </Button>
      </div>
    );
  }

  const filtered = table.getFilteredRowModel().rows.length;

  const searchActions = (
    <>
      <Input
        placeholder="Search by title, author, or category…"
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="w-full sm:w-64"
        aria-label="Search books"
      />
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="shrink-0" />}>
          Columns <ChevronDown className="ml-1.5 size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {table
            .getAllColumns()
            .filter((col) => col.getCanHide())
            .map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={col.getIsVisible()}
                onCheckedChange={(value) => col.toggleVisibility(!!value)}
                className="capitalize"
              >
                {col.id}
              </DropdownMenuCheckboxItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  return (
    <PageLayout
      title="Shamela Library"
      description={
        globalFilter
          ? `${filtered.toLocaleString()} of ${books.length.toLocaleString()} books`
          : `${books.length.toLocaleString()} books from shamela.ws`
      }
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
                    style={{ width: COLUMN_WIDTHS[header.id] }}
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
                  className={onBookClick ? "cursor-pointer" : undefined}
                  onClick={() => onBookClick?.(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{ width: COLUMN_WIDTHS[cell.column.id] }}
                      className={
                        cell.column.id === "name" ||
                        cell.column.id === "author" ||
                        cell.column.id === "category"
                          ? "whitespace-normal"
                          : undefined
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
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
