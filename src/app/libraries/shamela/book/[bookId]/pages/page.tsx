'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getBookContent } from '@/actions/book-download';
import { getBookDetails } from '@/actions/books';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Page, useBookPagesStore } from '@/stores/useBookPagesStore';

type PageRow = { id: number; content: string; pageNumber?: string; part?: string };

export default function BookPagesPage() {
    const router = useRouter();
    const { bookId } = useParams<{ bookId: string }>();
    const { getBookData, setBookData } = useBookPagesStore();
    const [loading, setLoading] = useState(true);
    const [bookTitle, setBookTitle] = useState<string>('');
    const [selectedTitleId, setSelectedTitleId] = useState<string>('all');

    const bookData = getBookData(bookId);

    useEffect(() => {
        const loadData = async () => {
            // Check store first
            if (bookData) {
                setLoading(false);
                const details = await getBookDetails('shamela', bookId);
                if (details) {
                    setBookTitle(details.titleTransliteration || details.title);
                }
                return;
            }

            // Load from server
            const [content, details] = await Promise.all([
                getBookContent('shamela', bookId),
                getBookDetails('shamela', bookId),
            ]);

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

    const columns: ColumnDef<PageRow>[] = useMemo(
        () => [
            {
                accessorKey: 'id',
                cell: ({ row }) => (
                    <span className="font-mono text-muted-foreground text-sm">{row.getValue('id')}</span>
                ),
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
                        Part
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                size: 100,
            },
            {
                accessorKey: 'content',
                cell: ({ row }) => {
                    const content = String(row.getValue('content'));
                    const preview = content.split('_________')[0].slice(0, 200);
                    return (
                        <Link
                            href={`/libraries/shamela/book/${bookId}/pages/${row.original.id}`}
                            className="block text-right hover:underline"
                        >
                            <div className="line-clamp-2 text-sm" dir="rtl">
                                {preview}...
                            </div>
                        </Link>
                    );
                },
                header: () => <div className="text-right">المحتوى</div>,
            },
        ],
        [bookId],
    );

    const filteredPages = useMemo(() => {
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
    }, [bookData, selectedTitleId]);

    const titlesTree = useMemo(() => {
        if (!bookData?.titles) {
            return [];
        }

        const buildTree = (parentId: number = 0): any[] => {
            return bookData.titles
                .filter((t) => (t.parent || 0) === parentId)
                .map((t) => ({ ...t, children: buildTree(t.id) }));
        };

        return buildTree();
    }, [bookData]);

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
                <div className="flex flex-1 flex-col gap-6 p-6">
                    <p className="text-muted-foreground">Loading pages...</p>
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
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="font-bold text-3xl tracking-tight">Book Pages</h1>
                        <p className="text-muted-foreground">
                            {filteredPages.length} page{filteredPages.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    {titlesTree.length > 0 && (
                        <Select value={selectedTitleId} onValueChange={setSelectedTitleId}>
                            <SelectTrigger className="w-[300px]">
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

                <DataTable
                    columns={columns}
                    data={filteredPages}
                    searchKey="content"
                    searchPlaceholder="Search page content..."
                />
            </div>
        </>
    );
}
