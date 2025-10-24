'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Search } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { searchBooks } from '@/actions/search';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';

type SearchResult = {
    authorId: string;
    authorName: string;
    bookId: string;
    bookTitle: string;
    content: string;
    pageId: number;
    pageNumber?: string;
};

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = useCallback(async () => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        const searchResults = await searchBooks('shamela', query);
        setResults(searchResults);
        setIsSearching(false);
    }, [query]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        },
        [handleSearch],
    );

    const columns = useMemo<ColumnDef<SearchResult>[]>(
        () => [
            {
                accessorKey: 'bookTitle',
                cell: ({ row }) => (
                    <Link
                        href={`/libraries/shamela/book/${row.original.bookId}`}
                        className="block text-right font-medium hover:underline"
                    >
                        {row.getValue('bookTitle')}
                    </Link>
                ),
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="-ml-4"
                    >
                        الكتاب
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
            },
            {
                accessorKey: 'authorName',
                cell: ({ row }) => (
                    <Link
                        href={`/libraries/shamela/author/${row.original.authorId}`}
                        className="block text-right hover:underline"
                    >
                        {row.getValue('authorName')}
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
            },
            {
                accessorKey: 'pageNumber',
                cell: ({ row }) => {
                    const value = row.getValue('pageNumber');
                    return (
                        <Link
                            href={`/libraries/shamela/book/${row.original.bookId}/pages/${row.original.pageId}`}
                            className="block text-center font-mono text-sm hover:underline"
                        >
                            {value ? String(value) : row.original.pageId}
                        </Link>
                    );
                },
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                        className="-ml-4"
                    >
                        الصفحة
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                size: 100,
            },
            {
                accessorKey: 'content',
                cell: ({ row }) => {
                    const content = String(row.getValue('content'));
                    const preview = content.slice(0, 300);
                    return (
                        <Link
                            href={`/libraries/shamela/book/${row.original.bookId}/pages/${row.original.pageId}`}
                            className="block text-right hover:underline"
                        >
                            <div className="line-clamp-3 text-sm leading-relaxed" dir="rtl">
                                {preview}...
                            </div>
                        </Link>
                    );
                },
                header: () => <div className="text-right">المحتوى</div>,
            },
        ],
        [],
    );

    return (
        <>
            <PageHeader title="Search" breadcrumbs={[{ href: '/', label: 'Libraries' }, { label: 'Search' }]} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="space-y-2">
                    <h1 className="font-bold text-3xl tracking-tight">Search Library</h1>
                    <p className="text-muted-foreground">Search across all downloaded books</p>
                </div>

                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Input
                            dir="rtl"
                            placeholder="ابحث في المكتبة..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="h-12 pr-10 text-lg"
                        />
                        <Search className="absolute top-3 right-3 h-6 w-6 text-muted-foreground" />
                    </div>
                    <Button size="lg" onClick={handleSearch} disabled={isSearching || !query.trim()}>
                        {isSearching ? 'Searching...' : 'Search'}
                    </Button>
                </div>

                {results.length > 0 ? (
                    <>
                        <p className="text-muted-foreground text-sm">
                            Found {results.length} result{results.length !== 1 ? 's' : ''}
                        </p>
                        <DataTable columns={columns} data={results} />
                    </>
                ) : query.trim() && !isSearching ? (
                    <p className="text-center text-muted-foreground">No results found</p>
                ) : null}
            </div>
        </>
    );
}
