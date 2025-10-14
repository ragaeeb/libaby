'use client';

import { Download } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { downloadBook, getBookDetails } from '@/actions/books';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import type { Book } from '@/lib/repository';

export default function ShamelaBookPage() {
    const { bookId } = useParams<{ bookId: string }>();
    const [book, setBook] = useState<Book | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const loadBook = async () => {
            const result = await getBookDetails('shamela', bookId);
            setBook(result);
            setLoading(false);
        };
        loadBook();
    }, [bookId]);

    const handleDownload = useCallback(async () => {
        setDownloading(true);
        try {
            await downloadBook('shamela', bookId);
            const updated = await getBookDetails('shamela', bookId);
            setBook(updated);
        } catch (error) {
            console.error('Download failed:', error);
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
                        { href: '/shamela', label: 'Shamela' },
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
                        { href: '/shamela', label: 'Shamela' },
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
                title={book.title}
                breadcrumbs={[
                    { href: '/', label: 'Libraries' },
                    { href: '/shamela', label: 'Shamela' },
                    { label: book.title },
                ]}
            />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <h1 className="font-bold text-4xl tracking-tight">{book.title}</h1>
                        <p className="text-muted-foreground text-xl">{book.author}</p>
                        {book.downloadedAt && (
                            <p className="text-green-600 text-sm">
                                Downloaded on {new Date(book.downloadedAt).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                    <Button size="lg" onClick={handleDownload} disabled={downloading || !!book.downloadedAt}>
                        <Download className="mr-2 h-5 w-5" />
                        {downloading ? 'Downloading...' : book.downloadedAt ? 'Downloaded' : 'Download Book'}
                    </Button>
                </div>

                <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2 rounded-lg border p-6">
                        <p className="font-medium text-muted-foreground text-sm">Chapters</p>
                        <p className="font-bold text-3xl">{book.chapters || 'N/A'}</p>
                    </div>
                    <div className="space-y-2 rounded-lg border p-6">
                        <p className="font-medium text-muted-foreground text-sm">Pages</p>
                        <p className="font-bold text-3xl">{book.pages ? book.pages.toLocaleString() : 'N/A'}</p>
                    </div>
                    <div className="space-y-2 rounded-lg border p-6">
                        <p className="font-medium text-muted-foreground text-sm">Book ID</p>
                        <p className="font-bold text-3xl">{book.externalId}</p>
                    </div>
                </div>

                {book.description && (
                    <div className="mt-4 space-y-4">
                        <h2 className="font-semibold text-2xl">About this Book</h2>
                        <p className="text-lg leading-relaxed">{book.description}</p>
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
