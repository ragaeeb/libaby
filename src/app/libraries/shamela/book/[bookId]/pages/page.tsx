'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, BookOpen, Search } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getBookContent } from '@/actions/book-download';
import { getBookDetails } from '@/actions/books';
import { searchBooks } from '@/actions/search';
import { CircularBarsSpinnerLoader } from '@/components/cuicui/circular-bars-spinner-loader';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getBrowserStorage } from '@/lib/storage/browser';
import { type BookData, type Page, useBookPagesStore } from '@/stores/useBookPagesStore';

type PageRow = { content: string; id: number; pageNumber?: string; part?: string };

const extractTitles = (content: string): { body: string; titles: string[] } => {
    const cleaned = content.replace(/\r/g, '\n');
    const titles: string[] = [];
    const titleRegex = /<span[^>]*data-type="title"[^>]*>\[([^\]]+)\]\s*\[?<\/span>/g;
    let match;
    while ((match = titleRegex.exec(cleaned)) !== null) {
        titles.push(match[1]);
    }
    const body = cleaned.replace(/<span[^>]*data-type="title"[^>]*>.*?<\/span>/g, '').trim();
    return { body, titles };
};

export default function BookPagesPage() {
    const router = useRouter();
    const { bookId } = useParams<{ bookId: string }>();
    const { getBookData, setBookData } = useBookPagesStore();
    const [loading, setLoading] = useState(true);
    const [bookTitle, setBookTitle] = useState<string>('');
    const [selectedTitleId, setSelectedTitleId] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PageRow[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const bookData = getBookData(bookId);

    useEffect(() => {
        const loadData = async () => {
            if (bookData) {
                setLoading(false);
                const details = await getBookDetails('shamela', bookId);
                if (details) {
                    setBookTitle(details.titleTransliteration || details.title);
                }
                return;
            }

            let content: BookData | null = null;
            const storage = await getBrowserStorage();
            const stored = await storage.getItem(`libraries/shamela/books/${bookId}.json`);

            if (typeof stored === 'string') {
                content = JSON.parse(stored) as BookData;
            } else {
                content = await getBookContent('shamela', bookId);
            }

            const details = await getBookDetails('shamela', bookId);

            if (content) {
                setBookData(bookId, content);
            }
            if (details) {
                setBookTitle(details.titleTransliteration || details.title);
            }
            setLoading(false);
        };

        loadData();
    }, [bookId, bookData, getBookData, setBookData]);

    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        const results = await searchBooks('shamela', searchQuery, bookId);
        const mapped = results.map((r) => ({
            content: r.content,
            id: r.pageId,
            pageNumber: r.pageNumber,
            part: undefined,
        }));
        setSearchResults(mapped);
        setIsSearching(false);
    }, [searchQuery, bookId]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        },
        [handleSearch],
    );

    const columns = useMemo<ColumnDef<PageRow>[]>(
        () => [
            {
                accessorKey: 'part',
                cell: ({ row }) => {
                    const value = row.getValue('part');
                    return value ? (
                        <span className="font-mono text-sm">{String(value)}</span>
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
                        Volume
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                size: 100,
            },
            {
                accessorKey: 'pageNumber',
                cell: ({ row }) => {
                    const value = row.getValue('pageNumber');
                    return value ? (
                        <span className="font-mono text-sm">{String(value)}</span>
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
                        Page
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                size: 100,
            },
            {
                accessorKey: 'content',
                cell: ({ row }) => {
                    const content = String(row.getValue('content') || '');
                    if (!content) {
                        return <span className="text-muted-foreground">No content</span>;
                    }

                    const mainContent = content.split('_________')[0];
                    const { body, titles } = extractTitles(mainContent);
                    const lines = body
                        .split('\n')
                        .map((l) => l.trim())
                        .filter((l) => l.length > 0);
                    const previewLines = lines.slice(0, 5);

                    return (
                        <Link href={`/libraries/shamela/book/${bookId}/pages/${row.original.id}`} className="block">
                            <div className="space-y-2 py-2">
                                {titles.length > 0 && (
                                    <div className="space-y-1">
                                        {titles.slice(0, 2).map((title, idx) => (
                                            <div
                                                key={idx}
                                                className="rounded bg-primary/10 px-3 py-1.5 text-right font-semibold text-sm"
                                            >
                                                <span dir="rtl">{title}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="space-y-1 text-right text-sm leading-relaxed" dir="rtl">
                                    {previewLines.map((line, idx) => (
                                        <div key={idx} className="break-words">
                                            {line}
                                        </div>
                                    ))}
                                    {lines.length > 5 && <div className="text-muted-foreground">...</div>}
                                </div>
                            </div>
                        </Link>
                    );
                },
                header: () => <div className="text-right">المحتوى</div>,
                meta: { className: 'whitespace-normal' },
            },
        ],
        [bookId],
    );

    const filteredPages = useMemo(() => {
        if (searchQuery.trim() && searchResults.length > 0) {
            return searchResults;
        }

        if (!bookData) {
            return [];
        }

        let pages = bookData.pages.filter((p) => !p.content.includes('is_deleted'));

        if (selectedTitleId !== 'all' && bookData.titles) {
            const titlePageNum = bookData.titles.find((t) => t.id === Number(selectedTitleId))?.page;
            if (titlePageNum) {
                pages = pages.filter((p) => p.page === titlePageNum || p.number === String(titlePageNum));
            }
        }

        return pages.map((p) => ({
            content: p.content,
            id: p.id,
            pageNumber: p.number || p.page?.toString(),
            part: p.part || undefined,
        }));
    }, [bookData, selectedTitleId, searchQuery, searchResults]);

    const hasTitles = !!bookData?.titles?.length;

    if (loading) {
        return (
            <>
                <PageHeader
                    title="Loading..."
                    breadcrumbs={[
                        { href: '/', label: 'Libraries' },
                        { href: '/libraries/shamela', label: 'Shamela' },
                        { href: `/libraries/shamela/book/${bookId}`, label: 'Book' },
                        { label: 'Pages' },
                    ]}
                />

                <div className="flex min-h-screen items-center justify-center">
                    <CircularBarsSpinnerLoader />
                </div>
            </>
        );
    }

    if (!bookData) {
        return (
            <>
                <PageHeader
                    title="Book Not Found"
                    breadcrumbs={[
                        { href: '/', label: 'Libraries' },
                        { href: '/libraries/shamela', label: 'Shamela' },
                        { label: 'Not Found' },
                    ]}
                />
                <div className="flex flex-1 flex-col gap-6 p-6">
                    <p className="text-muted-foreground">Book content not found. Please download the book first.</p>
                </div>
            </>
        );
    }

    return (
        <>
            <PageHeader
                title={bookTitle}
                breadcrumbs={[
                    { href: '/', label: 'Libraries' },
                    { href: '/libraries/shamela', label: 'Shamela' },
                    { href: `/libraries/shamela/book/${bookId}`, label: bookTitle },
                    { label: 'Pages' },
                ]}
            />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                        <h1 className="font-bold text-3xl tracking-tight">Book Pages</h1>
                        <p className="text-muted-foreground">
                            {filteredPages.length} page{filteredPages.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <div className="relative min-w-[300px]">
                            <Input
                                dir="rtl"
                                placeholder="ابحث في الكتاب..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="pr-10"
                            />
                            <Search className="absolute top-2.5 right-3 h-5 w-5 text-muted-foreground" />
                        </div>

                        {searchQuery.trim() && (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearchQuery('');
                                    setSearchResults([]);
                                }}
                            >
                                Clear
                            </Button>
                        )}

                        {!searchQuery.trim() && hasTitles && (
                            <Select value={selectedTitleId} onValueChange={setSelectedTitleId}>
                                <SelectTrigger className="w-[200px]">
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    <SelectValue placeholder="Filter by title..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Pages</SelectItem>
                                    {bookData.titles.map((title) => (
                                        <SelectItem key={title.id} value={String(title.id)}>
                                            <div className="text-right" dir="rtl">
                                                {title.content}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                <DataTable columns={columns} data={filteredPages} />
            </div>
        </>
    );
}
