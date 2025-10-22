import {
    type ColumnDef,
    type ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type SortingState,
    useReactTable,
    type VisibilityState,
} from '@tanstack/react-table';
import { ChevronDown } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type DataTableProps<TData, TValue> = {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    searchKey?: string;
    searchPlaceholder?: string;
    defaultColumnVisibility?: VisibilityState;
    globalFilterFn?: (row: TData, filterValue: string) => boolean;
};

export const DataTable = <TData, TValue>({
    columns,
    data,
    searchKey,
    searchPlaceholder = 'Search...',
    defaultColumnVisibility = {},
    globalFilterFn,
}: DataTableProps<TData, TValue>) => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [sorting, setSorting] = useState<SortingState>(() => {
        const sortBy = searchParams.get('sortBy');
        const sortOrder = searchParams.get('sortOrder');
        return sortBy ? [{ desc: sortOrder === 'desc', id: sortBy }] : [];
    });

    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(defaultColumnVisibility);
    const [globalFilter, setGlobalFilter] = useState(searchParams.get('q') || '');

    const [pagination, setPagination] = useState({
        pageIndex: Number(searchParams.get('page') || '0'),
        pageSize: Number(searchParams.get('pageSize') || '50'),
    });

    const filteredData = useMemo(() => {
        if (!globalFilter || !globalFilterFn) {
            return data;
        }
        const lowerFilter = globalFilter.toLowerCase();
        return data.filter((row) => globalFilterFn(row, lowerFilter));
    }, [data, globalFilter, globalFilterFn]);

    useEffect(() => {
        const params = new URLSearchParams();

        if (globalFilter) {
            params.set('q', globalFilter);
        }
        if (sorting.length > 0) {
            params.set('sortBy', sorting[0].id);
            params.set('sortOrder', sorting[0].desc ? 'desc' : 'asc');
        }
        if (pagination.pageIndex > 0) {
            params.set('page', String(pagination.pageIndex));
        }
        if (pagination.pageSize !== 50) {
            params.set('pageSize', String(pagination.pageSize));
        }

        router.replace(`?${params.toString()}`, { scroll: false });
    }, [globalFilter, sorting, pagination, router]);

    const table = useReactTable({
        columns,
        data: filteredData,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        state: { columnVisibility, pagination, sorting },
    });

    return (
        <div className="w-full space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                {searchKey && (
                    <>
                        <Input
                            placeholder={searchPlaceholder}
                            value={globalFilter}
                            onChange={(event) => setGlobalFilter(event.target.value)}
                            className="min-w-[200px] flex-1"
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    Columns <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {table
                                    .getAllColumns()
                                    .filter((column) => column.getCanHide())
                                    .map((column) => (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                        >
                                            {column.id}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Select
                            value={String(table.getState().pagination.pageSize)}
                            onValueChange={(value) => {
                                table.setPageSize(value === 'all' ? filteredData.length : Number(value));
                            }}
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="25">25 rows</SelectItem>
                                <SelectItem value="50">50 rows</SelectItem>
                                <SelectItem value="100">100 rows</SelectItem>
                                <SelectItem value="all">All rows</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="whitespace-nowrap text-muted-foreground text-sm">
                            {filteredData.length.toLocaleString()} book{filteredData.length !== 1 ? 's' : ''}
                        </div>
                    </>
                )}
            </div>
            <div className="w-full overflow-auto rounded-lg border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
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
            {table.getPageCount() > 1 && (
                <div className="flex items-center justify-end gap-2">
                    <div className="flex-1 text-muted-foreground text-sm">
                        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                    </div>
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
            )}
        </div>
    );
};
