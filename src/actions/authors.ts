'use server';

import { getMasterData } from '@/lib/cache/shamela/master';

export const getAuthorDetails = async (library: string, authorId: string) => {
    const data = await getMasterData(library);

    if (!data) {
        return null;
    }

    const author = data.master.authors.find((a: any) => String(a.id) === authorId);

    if (!author) {
        return null;
    }

    const categoryMap = new Map(data.master.categories.map((c: any) => [String(c.id), c.name]));

    const booksByAuthor = data.master.books
        .filter((b: any) => b.is_deleted === '0' && b.author === authorId)
        .map((b: any) => ({
            category: categoryMap.get(b.category) || b.category,
            categoryId: b.category,
            categoryTransliteration: data.translations?.categories?.transliterations?.[b.category],
            id: String(b.id),
            title: b.name,
            titleTransliteration: data.translations?.books?.transliterations?.[b.id],
        }));

    return {
        biography: author.biography || undefined,
        bookCount: booksByAuthor.length,
        books: booksByAuthor,
        deathYear: author.death_text || undefined,
        id: String(author.id),
        name: author.name,
        nameTransliteration: data.translations?.authors?.transliterations?.[author.id],
    };
};

export const getCategoryDetails = async (library: string, categoryId: string) => {
    const data = await getMasterData(library);

    if (!data) {
        return null;
    }

    const category = data.master.categories.find((c: any) => String(c.id) === categoryId);

    if (!category) {
        return null;
    }

    const authorMap = new Map(data.master.authors.map((a: any) => [String(a.id), a.name]));

    const booksInCategory = data.master.books
        .filter((b: any) => b.is_deleted === '0' && b.category === categoryId)
        .map((b: any) => ({
            author: authorMap.get(b.author) || b.author,
            authorId: b.author,
            authorTransliteration: data.translations?.authors?.transliterations?.[b.author],
            id: String(b.id),
            title: b.name,
            titleTransliteration: data.translations?.books?.transliterations?.[b.id],
        }));

    return {
        bookCount: booksInCategory.length,
        books: booksInCategory,
        id: String(category.id),
        name: category.name,
        nameTransliteration: data.translations?.categories?.transliterations?.[category.id],
    };
};
