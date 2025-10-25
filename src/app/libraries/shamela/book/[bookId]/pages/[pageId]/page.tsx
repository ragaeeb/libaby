'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getBookContent } from '@/actions/book-download';
import { getBookDetails } from '@/actions/books';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { getBrowserStorage } from '@/lib/storage/browser';
import { type Page, useBookPagesStore } from '@/stores/useBookPagesStore';

const extractTitles = (content: string): { body: string; titles: string[] } => {
    const cleaned = content.replace(/\r/g, '\n');
    const titles: string[] = [];

    // Extract all title spans
    const titleRegex = /<span[^>]*data-type="title"[^>]*>\[([^\]]+)\]\s*\[?<\/span>/g;
    let match;
    while ((match = titleRegex.exec(cleaned)) !== null) {
        titles.push(match[1]);
    }

    // Remove all title spans from body
    const body = cleaned.replace(/<span[^>]*data-type="title"[^>]*>.*?<\/span>/g, '').trim();

    return { body, titles };
};

const renderPageContent = (content: string) => {
    const parts = content.split('_________');
    const mainContent = parts[0].replace(/\r/g, '\n');
    const { body, titles } = extractTitles(mainContent);

    const bodyParts = body
        .split('\n')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
    const footnotes = parts.slice(1).map((f) => f.replace(/\r/g, '\n').trim());

    return (
        <div className="space-y-8">
            {titles.length > 0 && (
                <div className="space-y-3">
                    {titles.map((title, idx) => (
                        <div key={idx} className="rounded-lg bg-primary/10 px-6 py-4 text-right">
                            <h2 className="font-bold text-2xl" dir="rtl">
                                {title}
                            </h2>
                        </div>
                    ))}
                </div>
            )}

            <div className="prose prose-lg max-w-none" dir="rtl">
                {bodyParts.map((part, idx) => (
                    <p key={idx} className="mb-4 text-right leading-relaxed">
                        {part}
                    </p>
                ))}
            </div>

            {footnotes.length > 0 && (
                <div className="border-t pt-8">
                    <h3 className="mb-4 font-semibold text-lg">Footnotes</h3>
                    <div className="prose prose-sm max-w-none" dir="rtl">
                        {footnotes.map((footnote, idx) => (
                            <div key={idx} className="mb-4 text-right text-muted-foreground leading-relaxed">
                                {footnote}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

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
            let bookData = getBookData(bookId);

            if (!bookData) {
                const storage = await getBrowserStorage();
                const stored = await storage.getItem(`libraries/shamela/books/${bookId}.json`);
                if (typeof stored === 'string') {
                    bookData = JSON.parse(stored);
                } else {
                    bookData = await getBookContent('shamela', bookId);
                }

                if (bookData) {
                    setBookData(bookId, bookData);
                }
            }

            if (bookData) {
                const currentPage = bookData.pages.find((p) => p.id === Number(pageId));
                setPage(currentPage || null);

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
