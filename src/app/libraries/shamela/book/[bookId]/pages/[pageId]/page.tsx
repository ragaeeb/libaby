'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getBookContent, getBookPage } from '@/actions/book-download';
import { getBookDetails } from '@/actions/books';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { type Page, useBookPagesStore } from '@/stores/useBookPagesStore';

function renderPageContent(content: string) {
    const parts = content.split('_________');

    if (parts.length === 1) {
        // No footnotes
        return (
            <div className="prose prose-lg max-w-none" dir="rtl">
                <div className="whitespace-pre-wrap text-right leading-relaxed">{content}</div>
            </div>
        );
    }

    // Has footnotes
    const [body, ...footnotes] = parts;

    return (
        <div className="space-y-8">
            <div className="prose prose-lg max-w-none" dir="rtl">
                <div className="whitespace-pre-wrap text-right leading-relaxed">{body.trim()}</div>
            </div>

            {footnotes.length > 0 && (
                <div className="border-t pt-8">
                    <h3 className="mb-4 font-semibold text-lg">Footnotes</h3>
                    <div className="prose prose-sm max-w-none" dir="rtl">
                        {footnotes.map((footnote, idx) => (
                            <div key={idx} className="mb-4 text-right text-muted-foreground leading-relaxed">
                                {footnote.trim()}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function SinglePageView() {
    const router = useRouter();
    const { bookId, pageId } = useParams<{ bookId: string; pageId: string }>();
    const { getBookData, setBookData } = useBookPagesStore();
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState<Page | null>(null);
    const [bookTitle, setBookTitle] = useState<string>('');
    const [prevPageId, setPrevPageId] = useState<number | null>(null);
    const [nextPageId, setNextPageId] = useState<number | null>(null);

    useEffect(() => {
        const loadPage = async () => {
            const bookData = getBookData(bookId);

            if (!bookData) {
                // Load from server
                const content = await getBookContent('shamela', bookId);
                if (content) {
                    setBookData(bookId, content);
                    const currentPage = content.pages.find((p) => p.id === Number(pageId));
                    setPage(currentPage || null);

                    // Find prev/next
                    const currentIdx = content.pages.findIndex((p) => p.id === Number(pageId));
                    if (currentIdx > 0) {
                        setPrevPageId(content.pages[currentIdx - 1].id);
                    }
                    if (currentIdx < content.pages.length - 1) {
                        setNextPageId(content.pages[currentIdx + 1].id);
                    }
                }
            } else {
                const currentPage = bookData.pages.find((p) => p.id === Number(pageId));
                setPage(currentPage || null);

                // Find prev/next
                const currentIdx = bookData.pages.findIndex((p) => p.id === Number(pageId));
                if (currentIdx > 0) {
                    setPrevPageId(bookData.pages[currentIdx - 1].id);
                }
                if (currentIdx < bookData.pages.length - 1) {
                    setNextPageId(bookData.pages[currentIdx + 1].id);
                }
            }

            const details = await getBookDetails('shamela', bookId);
            if (details) {
                setBookTitle(details.titleTransliteration || details.title);
            }

            setLoading(false);
        };

        loadPage();
    }, [bookId, pageId, getBookData, setBookData]);

    if (loading) {
        return (
            <>
                <PageHeader
                    title="Loading..."
                    breadcrumbs={[
                        { href: '/', label: 'Libraries' },
                        { href: '/libraries/shamela', label: 'Shamela' },
                        { href: `/libraries/shamela/book/${bookId}`, label: 'Book' },
                        { href: `/libraries/shamela/book/${bookId}/pages`, label: 'Pages' },
                        { label: 'Loading...' },
                    ]}
                />
                <div className="flex flex-1 flex-col gap-6 p-6">
                    <p className="text-muted-foreground">Loading page...</p>
                </div>
            </>
        );
    }

    if (!page) {
        return (
            <>
                <PageHeader
                    title="Page Not Found"
                    breadcrumbs={[
                        { href: '/', label: 'Libraries' },
                        { href: '/libraries/shamela', label: 'Shamela' },
                        { href: `/libraries/shamela/book/${bookId}`, label: bookTitle },
                        { href: `/libraries/shamela/book/${bookId}/pages`, label: 'Pages' },
                        { label: 'Not Found' },
                    ]}
                />
                <div className="flex flex-1 flex-col gap-6 p-6">
                    <p className="text-muted-foreground">Page not found.</p>
                </div>
            </>
        );
    }

    return (
        <>
            <PageHeader
                title={`Page ${page.number || page.id}`}
                breadcrumbs={[
                    { href: '/', label: 'Libraries' },
                    { href: '/libraries/shamela', label: 'Shamela' },
                    { href: `/libraries/shamela/book/${bookId}`, label: bookTitle },
                    { href: `/libraries/shamela/book/${bookId}/pages`, label: 'Pages' },
                    { label: `Page ${page.number || page.id}` },
                ]}
            />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/libraries/shamela/book/${bookId}/pages/${prevPageId}`)}
                        disabled={!prevPageId}
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Previous Page
                    </Button>

                    <div className="text-center">
                        <div className="text-muted-foreground text-sm">
                            {page.part && `Part ${page.part} • `}
                            Page {page.number || page.id}
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => router.push(`/libraries/shamela/book/${bookId}/pages/${nextPageId}`)}
                        disabled={!nextPageId}
                    >
                        Next Page
                        <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>

                <div className="rounded-lg border bg-card p-8">{renderPageContent(page.content)}</div>
            </div>
        </>
    );
}
