'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAuthorDetails } from '@/actions/authors';
import { PageHeader } from '@/components/page-header';
import { PaginatedBooksTable } from '@/components/paginated-books-table';

type AuthorData = {
    id: string;
    name: string;
    nameTransliteration?: string;
    biography?: string;
    deathYear?: string;
    bookCount: number;
    books: Array<{
        id: string;
        title: string;
        titleTransliteration?: string;
        category: string;
        categoryId: string;
        categoryTransliteration?: string;
    }>;
};

export default function AuthorPage() {
    const { authorId } = useParams<{ authorId: string }>();
    const [author, setAuthor] = useState<AuthorData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAuthor = async () => {
            const result = await getAuthorDetails('shamela', authorId);
            setAuthor(result);
            setLoading(false);
        };
        loadAuthor();
    }, [authorId]);

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
                    <p className="text-muted-foreground">Loading author details...</p>
                </div>
            </>
        );
    }

    if (!author) {
        return (
            <>
                <PageHeader
                    title="Author Not Found"
                    breadcrumbs={[
                        { href: '/', label: 'Libraries' },
                        { href: '/libraries/shamela', label: 'Shamela' },
                        { label: 'Not Found' },
                    ]}
                />
                <div className="flex flex-1 flex-col gap-6 p-6">
                    <p className="text-muted-foreground">The requested author could not be found.</p>
                </div>
            </>
        );
    }

    return (
        <>
            <PageHeader
                title={author.nameTransliteration || author.name}
                breadcrumbs={[
                    { href: '/', label: 'Libraries' },
                    { href: '/libraries/shamela', label: 'Shamela' },
                    { label: author.nameTransliteration || author.name },
                ]}
            />
            <div className="flex w-full flex-1 flex-col gap-6 p-6">
                <div className="space-y-2">
                    {author.nameTransliteration && (
                        <h1 className="break-words font-bold text-4xl tracking-tight">{author.nameTransliteration}</h1>
                    )}
                    <h2 className="break-words text-right font-bold text-3xl tracking-tight">{author.name}</h2>
                    {author.deathYear && <p className="text-muted-foreground text-xl">d. {author.deathYear}</p>}
                    <p className="text-muted-foreground">
                        {author.bookCount} book{author.bookCount !== 1 ? 's' : ''} in library
                    </p>
                </div>

                {author.biography && (
                    <div className="mt-4 space-y-4">
                        <h2 className="font-semibold text-2xl">Biography</h2>
                        <p className="whitespace-pre-wrap text-right text-lg leading-relaxed">{author.biography}</p>
                    </div>
                )}

                <div className="mt-8 space-y-4">
                    <h2 className="font-semibold text-2xl">Books by {author.nameTransliteration || author.name}</h2>
                    <PaginatedBooksTable
                        books={author.books}
                        showCategory
                        hasTransliterations={!!author.books[0]?.titleTransliteration}
                    />
                </div>
            </div>
        </>
    );
}
