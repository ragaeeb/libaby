'use client';

import { Download } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getLibraryBooks } from '@/actions/books';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';

type Book = { id: string; title: string; author: string };

export default function ShamelaPage() {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadBooks = async () => {
            const result = await getLibraryBooks('shamela');
            setBooks(result);
            setLoading(false);
        };
        loadBooks();
    }, []);

    const handleDownload = useCallback((bookId: string) => {
        console.log(`Downloading book ${bookId} from shamela`);
    }, []);

    if (loading) {
        return (
            <>
                <PageHeader
                    title="Shamela Library"
                    breadcrumbs={[{ href: '/', label: 'Libraries' }, { label: 'Shamela' }]}
                />
                <div className="flex flex-1 flex-col gap-6 p-6">
                    <p className="text-muted-foreground">Loading books...</p>
                </div>
            </>
        );
    }

    return (
        <>
            <PageHeader
                title="Shamela Library"
                breadcrumbs={[{ href: '/', label: 'Libraries' }, { label: 'Shamela' }]}
            />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="font-bold text-3xl tracking-tight">Shamela Library</h1>
                    <p className="mt-2 text-muted-foreground">Browse and download books from shamela.ws</p>
                </div>

                <div className="space-y-3">
                    {books.map((book) => (
                        <div
                            key={book.id}
                            className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                        >
                            <Link href={`/shamela/${book.id}`} className="flex-1">
                                <div className="space-y-1">
                                    <h3 className="font-semibold hover:underline">{book.title}</h3>
                                    <p className="text-muted-foreground text-sm">{book.author}</p>
                                </div>
                            </Link>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(book.id)}
                                className="ml-4"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
