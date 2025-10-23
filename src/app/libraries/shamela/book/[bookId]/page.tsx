'use client';

import { BookOpen, Download } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { downloadBook } from '@/actions/book-download';
import { getBookDetails } from '@/actions/books';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useLibraryStore } from '@/stores/useLibraryStore';

type BookDetails = {
    id: number;
    externalId: string;
    library: string;
    title: string;
    titleTransliteration?: string;
    author: string;
    authorId?: string;
    authorTransliteration?: string;
    category?: string;
    categoryId?: string;
    categoryTransliteration?: string;
    description?: string | null;
    chapters?: number | null;
    pages?: number | null;
    downloadedAt?: Date | null;
};

export default function ShamelaBookPage() {
    const { bookId } = useParams<{ bookId: string }>();
    const { books } = useLibraryStore();
    const [book, setBook] = useState<BookDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const loadBook = async () => {
            const cachedBook = books.find((b) => b.id === bookId);
            if (cachedBook) {
                setBook({
                    author: cachedBook.author,
                    authorId: cachedBook.authorId,
                    authorTransliteration: cachedBook.authorTransliteration,
                    category: cachedBook.category,
                    categoryId: cachedBook.categoryId,
                    categoryTransliteration: cachedBook.categoryTransliteration,
                    chapters: null,
                    description: null,
                    downloadedAt: null,
                    externalId: cachedBook.id,
                    id: Number(cachedBook.id),
                    library: 'shamela',
                    pages: null,
                    title: cachedBook.title,
                    titleTransliteration: cachedBook.titleTransliteration,
                });
            }

            const result = await getBookDetails('shamela', bookId);
            setBook(result);
            setLoading(false);
        };
        loadBook();
    }, [bookId, books]);

    const handleDownload = useCallback(async () => {
        setDownloading(true);
        try {
            await downloadBook('shamela', bookId);
            const updated = await getBookDetails('shamela', bookId);
            setBook(updated);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Download failed. Please try again.');
        }
        setDownloading(false);
    }, [bookId]);

    if (loading) {
        return (
            <>
                <PageHeader
                    title="Loading..."
                    breadcrumbs={[
                        { href: '/', label: 'Libraries' },
                        { href: '/libraries/shamela', label: 'Shamela' },
                        { label: 'Loading...' },
                    ]}
                />
                <div className="flex flex-1 flex-col gap-6 p-6">
                    <p className="text-muted-foreground">Loading book details...</p>
                </div>
            </>
        );
    }

    if (!book) {
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
                    <p className="text-muted-foreground">The requested book could not be found.</p>
                </div>
            </>
        );
    }

    return (
        <>
            <PageHeader
                title={book.titleTransliteration || book.title}
                breadcrumbs={[
                    { href: '/', label: 'Libraries' },
                    { href: '/libraries/shamela', label: 'Shamela' },
                    { label: book.titleTransliteration || book.title },
                ]}
            />
            <div className="flex w-full flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                        {book.titleTransliteration && (
                            <h1 className="break-words font-bold text-4xl tracking-tight">
                                {book.titleTransliteration}
                            </h1>
                        )}
                        <h2 className="break-words text-right font-bold text-3xl tracking-tight">{book.title}</h2>

                        <div className="flex items-center justify-between gap-4">
                            {book.authorTransliteration && (
                                <Link
                                    href={`/libraries/shamela/author/${book.authorId}`}
                                    className="text-muted-foreground text-xl hover:underline"
                                >
                                    {book.authorTransliteration}
                                </Link>
                            )}
                            {book.authorId ? (
                                <Link
                                    href={`/libraries/shamela/author/${book.authorId}`}
                                    className="text-right text-muted-foreground text-xl hover:underline"
                                >
                                    {book.author}
                                </Link>
                            ) : (
                                <p className="text-right text-muted-foreground text-xl">{book.author}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            {book.categoryTransliteration && book.categoryId && (
                                <Link
                                    href={`/libraries/shamela/category/${book.categoryId}`}
                                    className="text-muted-foreground hover:underline"
                                >
                                    {book.categoryTransliteration}
                                </Link>
                            )}
                            {book.category && book.categoryId && (
                                <Link
                                    href={`/libraries/shamela/category/${book.categoryId}`}
                                    className="text-right text-muted-foreground hover:underline"
                                >
                                    {book.category}
                                </Link>
                            )}
                        </div>

                        {book.downloadedAt && (
                            <p className="text-green-600 text-sm">
                                Downloaded on {new Date(book.downloadedAt).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                        {book.downloadedAt && (
                            <Button size="lg" asChild variant="outline">
                                <Link href={`/libraries/shamela/book/${bookId}/pages`}>
                                    <BookOpen className="mr-2 h-5 w-5" />
                                    View Pages
                                </Link>
                            </Button>
                        )}
                        <Button size="lg" onClick={handleDownload} disabled={downloading || !!book.downloadedAt}>
                            <Download className="mr-2 h-5 w-5" />
                            {downloading ? 'Downloading...' : book.downloadedAt ? 'Downloaded' : 'Download Book'}
                        </Button>
                    </div>
                </div>

                <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {book.chapters && (
                        <div className="space-y-2 rounded-lg border p-6">
                            <p className="font-medium text-muted-foreground text-sm">Chapters</p>
                            <p className="font-bold text-3xl">{book.chapters}</p>
                        </div>
                    )}
                    {book.pages && (
                        <div className="space-y-2 rounded-lg border p-6">
                            <p className="font-medium text-muted-foreground text-sm">Pages</p>
                            <p className="font-bold text-3xl">{book.pages.toLocaleString()}</p>
                        </div>
                    )}
                    <div className="space-y-2 rounded-lg border p-6">
                        <p className="font-medium text-muted-foreground text-sm">Book ID</p>
                        <p className="font-bold text-3xl">{book.externalId}</p>
                    </div>
                </div>

                {book.description && (
                    <div className="mt-4 space-y-4">
                        <h2 className="font-semibold text-2xl">About this Book</h2>
                        <p className="whitespace-pre-wrap text-lg leading-relaxed">{book.description}</p>
                    </div>
                )}

                <div className="mt-8 rounded-lg bg-muted/50 p-6">
                    <h3 className="mb-2 font-semibold text-lg">Preview</h3>
                    <p className="text-muted-foreground">
                        {book.downloadedAt
                            ? 'Book content is available. Reader functionality coming soon.'
                            : 'Book preview will be available after download.'}
                    </p>
                </div>
            </div>
        </>
    );
}
