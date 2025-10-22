'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getShamelaBooks } from '@/actions/shamela';
import { PageHeader } from '@/components/page-header';
import { DataTable } from '@/components/ui/data-table';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { type BookRow, createColumns, getDefaultVisibility } from './columns';

export default function ShamelaPage() {
    const { books, hasTransliterations, isLoaded, setBooks } = useLibraryStore();
    const [loading, setLoading] = useState(!isLoaded);

    useEffect(() => {
        if (isLoaded) {
            setLoading(false);
            return;
        }

        const loadBooks = async () => {
            const { books: bookRows, hasTransliterations: hasTranslit } = await getShamelaBooks();
            setBooks(bookRows, hasTranslit);
            setLoading(false);
        };
        loadBooks();
    }, [isLoaded, setBooks]);

    const columns = useMemo(() => createColumns(hasTransliterations), [hasTransliterations]);
    const defaultVisibility = useMemo(() => getDefaultVisibility(hasTransliterations), [hasTransliterations]);

    const globalFilterFn = useCallback((row: BookRow, filterValue: string) => {
        const searchTerms = filterValue.split(/\s+/).filter((t) => t.length > 0);

        const searchFields = [
            row.title,
            row.titleTransliteration,
            row.titleNormalized,
            row.author,
            row.authorTransliteration,
            row.authorNormalized,
            row.category,
            row.categoryTransliteration,
            row.categoryNormalized,
        ].map((f) => f?.toLowerCase() || '');

        return searchTerms.every((term) => searchFields.some((field) => field.includes(term)));
    }, []);

    if (loading) {
        return (
            <>
                <PageHeader
                    title="Shamela Library"
                    breadcrumbs={[{ href: '/', label: 'Libraries' }, { label: 'Shamela' }]}
                />
                <div className="flex flex-1 flex-col gap-6 p-6">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="text-muted-foreground">Loading books...</p>
                    </div>
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
                <div className="space-y-2">
                    <h1 className="font-bold text-3xl tracking-tight">Shamela Library</h1>
                    <p className="text-muted-foreground">
                        Browse and search {books.length.toLocaleString()} books from shamela.ws
                    </p>
                </div>
                <DataTable
                    columns={columns}
                    data={books}
                    searchKey="title"
                    searchPlaceholder="Search by title, author, or category (Arabic or Latin)..."
                    defaultColumnVisibility={defaultVisibility}
                    globalFilterFn={globalFilterFn}
                />
            </div>
        </>
    );
}
