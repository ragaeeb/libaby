import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';

export type BookTableRow = {
    id: string;
    title: string;
    titleTransliteration?: string;
    titleNormalized?: string;
    author?: string;
    authorId?: string;
    authorTransliteration?: string;
    authorNormalized?: string;
    category?: string;
    categoryId?: string;
    categoryTransliteration?: string;
    categoryNormalized?: string;
};

type PaginatedBooksTableProps = {
    books: BookTableRow[];
    showAuthor?: boolean;
    showCategory?: boolean;
    hasTransliterations?: boolean;
};

export function PaginatedBooksTable({
    books,
    showAuthor = false,
    showCategory = false,
    hasTransliterations = true,
}: PaginatedBooksTableProps) {
    const columns = useMemo(() => {
        const cols: ColumnDef<BookTableRow>[] = [
            {
                accessorKey: 'id',
                cell: ({ row }) => (
                    <span className="font-mono text-muted-foreground text-sm">{row.getValue('id')}</span>
                ),
                enableHiding: false,
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="-ml-4"
                    >
                        ID
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                size: 80,
            },
            {
                accessorKey: 'title',
                cell: ({ row }) => (
                    <Link
                        href={`/libraries/shamela/book/${row.original.id}`}
                        className="block text-right font-medium hover:underline"
                    >
                        {row.getValue('title')}
                    </Link>
                ),
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="-ml-4"
                    >
                        العنوان
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
            },
        ];

        if (hasTransliterations) {
            cols.push({
                accessorKey: 'titleTransliteration',
                cell: ({ row }) => {
                    const value = row.getValue('titleTransliteration');
                    return value ? (
                        <Link
                            href={`/libraries/shamela/book/${row.original.id}`}
                            className="text-muted-foreground hover:underline"
                        >
                            {String(value)}
                        </Link>
                    ) : (
                        <span className="text-muted-foreground">—</span>
                    );
                },
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="-ml-4"
                    >
                        Title
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
            });
        }

        if (showAuthor) {
            cols.push({
                accessorKey: 'author',
                cell: ({ row }) => (
                    <Link
                        href={`/libraries/shamela/author/${row.original.authorId}`}
                        className="block text-right hover:underline"
                    >
                        {row.getValue('author')}
                    </Link>
                ),
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="-ml-4"
                    >
                        المؤلف
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
            });

            if (hasTransliterations) {
                cols.push({
                    accessorKey: 'authorTransliteration',
                    cell: ({ row }) => {
                        const value = row.getValue('authorTransliteration');
                        return value ? (
                            <Link
                                href={`/libraries/shamela/author/${row.original.authorId}`}
                                className="text-muted-foreground hover:underline"
                            >
                                {String(value)}
                            </Link>
                        ) : (
                            <span className="text-muted-foreground">—</span>
                        );
                    },
                    header: ({ column }) => (
                        <Button
                            variant="ghost"
                            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                            className="-ml-4"
                        >
                            Author
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    ),
                });
            }
        }

        if (showCategory) {
            cols.push({
                accessorKey: 'category',
                cell: ({ row }) => (
                    <Link
                        href={`/libraries/shamela/category/${row.original.categoryId}`}
                        className="block text-right hover:underline"
                    >
                        {row.getValue('category')}
                    </Link>
                ),
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="-ml-4"
                    >
                        التصنيف
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
            });

            if (hasTransliterations) {
                cols.push({
                    accessorKey: 'categoryTransliteration',
                    cell: ({ row }) => {
                        const value = row.getValue('categoryTransliteration');
                        return value ? (
                            <Link
                                href={`/libraries/shamela/category/${row.original.categoryId}`}
                                className="text-muted-foreground hover:underline"
                            >
                                {String(value)}
                            </Link>
                        ) : (
                            <span className="text-muted-foreground">—</span>
                        );
                    },
                    header: ({ column }) => (
                        <Button
                            variant="ghost"
                            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                            className="-ml-4"
                        >
                            Category
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    ),
                });
            }
        }

        return cols;
    }, [showAuthor, showCategory, hasTransliterations]);

    const defaultVisibility = useMemo(
        () => ({
            author: false,
            authorTransliteration: hasTransliterations && showAuthor,
            category: false,
            categoryTransliteration: hasTransliterations && showCategory,
            title: false,
            titleTransliteration: hasTransliterations,
        }),
        [hasTransliterations, showAuthor, showCategory],
    );

    const globalFilterFn = useCallback((row: BookTableRow, filterValue: string) => {
        const searchTerms = filterValue.split(/\s+/).filter((t) => t.length > 0);

        const searchFields = [
            row.title,
            row.titleTransliteration,
            row.titleNormalized,
            row.author,
            row.authorTransliteration,
            row.authorNormalized,
            row.category,
            row.categoryTransliteration,
            row.categoryNormalized,
        ].map((f) => f?.toLowerCase() || '');

        return searchTerms.every((term) => searchFields.some((field) => field.includes(term)));
    }, []);

    return (
        <DataTable
            columns={columns}
            data={books}
            searchKey="title"
            searchPlaceholder="Search by title, author, or category (Arabic or Latin)..."
            defaultColumnVisibility={defaultVisibility}
            globalFilterFn={globalFilterFn}
        />
    );
}
