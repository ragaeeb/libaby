'use server';

import { getMasterData } from '@/lib/data';

type BookRow = {
    author: string;
    authorId: string;
    authorNormalized?: string;
    authorTransliteration?: string;
    category: string;
    categoryId: string;
    categoryNormalized?: string;
    categoryTransliteration?: string;
    id: string;
    title: string;
    titleNormalized?: string;
    titleTransliteration?: string;
};

const normalizeText = (text: string): string => {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[āīū]/g, (m) => ({ ā: 'a', ī: 'i', ū: 'u' })[m] || m)
        .replace(/[ḍṣṭẓḥ]/g, (m) => ({ ḍ: 'd', ḥ: 'h', ṣ: 's', ṭ: 't', ẓ: 'z' })[m] || m);
};

export const getShamelaBooks = async (): Promise<{ books: BookRow[]; hasTransliterations: boolean }> => {
    const data = await getMasterData('shamela');

    if (!data) {
        return { books: [], hasTransliterations: false };
    }

    const authorMap = new Map(data.master.authors.map((a) => [String(a.id), a.name]));
    const categoryMap = new Map(data.master.categories.map((c) => [String(c.id), c.name]));

    const authorTranslitMap = data.translations?.authors?.transliterations || {};
    const bookTranslitMap = data.translations?.books?.transliterations || {};
    const categoryTranslitMap = data.translations?.categories?.transliterations || {};

    const hasTransliterations = Object.keys(bookTranslitMap).length > 0;

    const books: BookRow[] = data.master.books
        .filter((book) => book.is_deleted === '0')
        .map((book) => {
            const titleTranslit = bookTranslitMap[book.id];
            const authorTranslit = authorTranslitMap[book.author];
            const categoryTranslit = categoryTranslitMap[book.category];

            return {
                author: authorMap.get(book.author) || book.author,
                authorId: book.author,
                authorNormalized: authorTranslit ? normalizeText(authorTranslit) : undefined,
                authorTransliteration: authorTranslit,
                category: categoryMap.get(book.category) || book.category,
                categoryId: book.category,
                categoryNormalized: categoryTranslit ? normalizeText(categoryTranslit) : undefined,
                categoryTransliteration: categoryTranslit,
                id: String(book.id),
                title: book.name,
                titleNormalized: titleTranslit ? normalizeText(titleTranslit) : undefined,
                titleTransliteration: titleTranslit,
            };
        });

    return { books, hasTransliterations };
};
