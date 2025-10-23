'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCategoryDetails } from '@/actions/authors';
import { PageHeader } from '@/components/page-header';
import { PaginatedBooksTable } from '@/components/paginated-books-table';

type CategoryData = {
    id: string;
    name: string;
    nameTransliteration?: string;
    bookCount: number;
    books: Array<{
        id: string;
        title: string;
        titleTransliteration?: string;
        author: string;
        authorId: string;
        authorTransliteration?: string;
    }>;
};

export default function CategoryPage() {
    const { categoryId } = useParams<{ categoryId: string }>();
    const [category, setCategory] = useState<CategoryData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadCategory = async () => {
            const result = await getCategoryDetails('shamela', categoryId);
            setCategory(result);
            setLoading(false);
        };
        loadCategory();
    }, [categoryId]);

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
                    <p className="text-muted-foreground">Loading category details...</p>
                </div>
            </>
        );
    }

    if (!category) {
        return (
            <>
                <PageHeader
                    title="Category Not Found"
                    breadcrumbs={[
                        { href: '/', label: 'Libraries' },
                        { href: '/libraries/shamela', label: 'Shamela' },
                        { label: 'Not Found' },
                    ]}
                />
                <div className="flex flex-1 flex-col gap-6 p-6">
                    <p className="text-muted-foreground">The requested category could not be found.</p>
                </div>
            </>
        );
    }

    return (
        <>
            <PageHeader
                title={category.nameTransliteration || category.name}
                breadcrumbs={[
                    { href: '/', label: 'Libraries' },
                    { href: '/libraries/shamela', label: 'Shamela' },
                    { label: category.nameTransliteration || category.name },
                ]}
            />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="space-y-2">
                    {category.nameTransliteration && (
                        <h1 className="break-words font-bold text-4xl tracking-tight">
                            {category.nameTransliteration}
                        </h1>
                    )}
                    <h2 className="break-words text-right font-bold text-3xl tracking-tight">{category.name}</h2>
                    <p className="text-muted-foreground">
                        {category.bookCount} book{category.bookCount !== 1 ? 's' : ''} in this category
                    </p>
                </div>

                <div className="mt-8 space-y-4">
                    <h2 className="font-semibold text-2xl">Books in {category.nameTransliteration || category.name}</h2>
                    <PaginatedBooksTable
                        books={category.books}
                        showAuthor
                        hasTransliterations={!!category.books[0]?.titleTransliteration}
                    />
                </div>
            </div>
        </>
    );
}
