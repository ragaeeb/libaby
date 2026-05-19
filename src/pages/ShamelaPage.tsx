import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, Languages, Loader2 } from "lucide-react";
import type { DenormalizedBook } from "@/types/books";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
import {
  downloadAndCacheMaster,
  isMasterCached,
  queryMasterBooks,
  type MasterQueryResult,
} from "@/lib/huggingface";
import { useSettingsStore } from "@/stores/useSettingsStore";

type Lang = "en" | "ar";

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

function buildColumns(lang: Lang): ColumnDef<DenormalizedBook>[] {
  const isAr = lang === "ar";

  return [
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
      cell: ({ row }) => {
        const book = row.original;
        const text = isAr ? book.name : (book.en_name ?? book.name);
        return (
          <span
            className="line-clamp-2 block whitespace-normal text-sm font-medium"
            dir={isAr ? "rtl" : "ltr"}
            title={text}
          >
            {text}
          </span>
        );
      },
    },
    {
      id: "author",
      accessorFn: (row) => isAr ? row.author?.name : (row.en_author ?? row.author?.name),
      header: ({ column }) => <SortableHeader column={column} label="Author" />,
      cell: ({ row }) => {
        const book = row.original;
        const text = isAr ? book.author?.name : (book.en_author ?? book.author?.name);
        return (
          <span
            className="line-clamp-1 block whitespace-normal text-sm"
            dir={isAr ? "rtl" : "ltr"}
            title={text}
          >
            {text}
          </span>
        );
      },
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
      accessorFn: (row) => isAr ? row.category?.name : (row.en_category ?? row.category?.name),
      header: ({ column }) => <SortableHeader column={column} label="Category" />,
      cell: ({ row }) => {
        const book = row.original;
        const text = isAr ? book.category?.name : (book.en_category ?? book.category?.name);
        return (
          <span
            className="line-clamp-1 block whitespace-normal text-sm text-muted-foreground"
            dir={isAr ? "rtl" : "ltr"}
            title={text}
          >
            {text}
          </span>
        );
      },
    },
    {
      accessorKey: "printed",
      header: ({ column }) => <SortableHeader column={column} label="Printed" />,
      cell: ({ row }) => {
        const value = row.getValue("printed") as number;
        return (
          <span className="text-xs text-muted-foreground">{value === 1 ? "Yes" : "No"}</span>
        );
      },
    },
    {
      accessorKey: "version",
      header: ({ column }) => <SortableHeader column={column} label="Version" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.getValue("version")}
        </span>
      ),
    },
  ];
}

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

const LANG_LABELS: Record<Lang, string> = {
  en: "English",
  ar: "Arabic",
};

export function ShamelaPage({
  onBookClick,
}: {
  onBookClick?: (bookId: number, bookTitle: string) => void;
}) {
  const token = useSettingsStore((s) => s.huggingfaceToken);
  const dataset = useSettingsStore((s) => s.shamelaDataset);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(defaultVisibility);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MasterQueryResult | null>(null);
  const [lang, setLang] = useState<Lang>("en");

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const activeSort = sorting[0];

  const columns = useMemo(() => buildColumns(lang), [lang]);

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, [deferredSearchQuery]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    const load = async () => {
      if (!(await isMasterCached())) {
        await downloadAndCacheMaster(token, dataset);
      }

      return queryMasterBooks({
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        query: deferredSearchQuery,
        sortBy: activeSort?.id,
        sortDesc: activeSort?.desc,
      });
    };

    load()
      .then((queryResult) => {
        if (cancelled) return;
        setResult(queryResult);
        setLoading(false);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        const message =
          loadError instanceof Error
            ? loadError.message
            : typeof loadError === "string"
              ? loadError
              : "Failed to load books";
        setError(message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeSort?.desc, activeSort?.id, dataset, deferredSearchQuery, pagination.pageIndex, pagination.pageSize, token]);

  const pageCount = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  const table = useReactTable({
    data: result?.items ?? [],
    columns,
    state: { sorting, columnVisibility, pagination },
    onSortingChange: (updater) => {
      const nextSorting = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(nextSorting);
      setPagination((current) => ({ ...current, pageIndex: 0 }));
    },
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount,
  });

  if (loading && !result) {
    return (
      <div className="flex flex-1 items-center justify-center gap-3 p-6">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading books database…</p>
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
    <>
      <Input
        placeholder="Search by title, author, or category…"
        value={searchQuery}
        onChange={(event) => {
          const value = event.target.value;
          startTransition(() => {
            setSearchQuery(value);
          });
        }}
        className="w-full sm:w-64"
        aria-label="Search books"
      />

      {/* Language toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="shrink-0" />}>
          <Languages className="mr-1.5 size-4" />
          {LANG_LABELS[lang]}
          <ChevronDown className="ml-1.5 size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup value={lang} onValueChange={(v) => setLang(v as Lang)}>
            <DropdownMenuRadioItem value="en">English</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="ar">Arabic</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Column visibility */}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="shrink-0" />}>
          Columns <ChevronDown className="ml-1.5 size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {table
            .getAllColumns()
            .filter((column) => column.getCanHide())
            .map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
                className="capitalize"
              >
                {column.id}
              </DropdownMenuCheckboxItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  const filteredCount = result?.total ?? 0;
  const totalCount = result?.totalAll ?? 0;

  return (
    <PageLayout
      title="Shamela Library"
      description={
        deferredSearchQuery
          ? `${filteredCount.toLocaleString()} of ${totalCount.toLocaleString()} books`
          : `${totalCount.toLocaleString()} books from shamela.ws`
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
                  onClick={() => onBookClick?.(row.original.id, row.original.en_name ?? row.original.name)}
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
          Page {pagination.pageIndex + 1} of {pageCount}
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
