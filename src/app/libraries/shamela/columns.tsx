import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export type BookRow = {
    id: string;
    title: string;
    titleTransliteration?: string;
    titleNormalized?: string;
    author: string;
    authorId: string;
    authorTransliteration?: string;
    authorNormalized?: string;
    category: string;
    categoryId: string;
    categoryTransliteration?: string;
    categoryNormalized?: string;
};

export const createColumns = (hasTransliterations: boolean): ColumnDef<BookRow>[] => {
    const columns: ColumnDef<BookRow>[] = [
        {
            accessorKey: 'id',
            cell: ({ row }) => <span className="font-mono text-muted-foreground text-sm">{row.getValue('id')}</span>,
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
        columns.push({
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

    columns.push({
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
        columns.push({
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

    columns.push({
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
        columns.push({
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

    return columns;
};

export const getDefaultVisibility = (hasTransliterations: boolean) => ({
    author: false,
    authorTransliteration: hasTransliterations,
    category: false,
    categoryTransliteration: hasTransliterations,
    title: false,
    titleTransliteration: hasTransliterations,
});
