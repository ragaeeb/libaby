'use server';

import { getShamelaMasterData } from '@/lib/repository';

type BookRow = {
    id: string;
    title: string;
    titleTransliteration?: string;
    titleNormalized?: string;
    author: string;
    authorId: string;
    authorTransliteration?: string;
    authorNormalized?: string;
    category: string;
    categoryId: string;
    categoryTransliteration?: string;
    categoryNormalized?: string;
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
    const { master, translations } = await getShamelaMasterData('shamela');

    if (!master) {
        return { books: [], hasTransliterations: false };
    }

    const authorMap = new Map(master.authors.map((a) => [String(a.id), a.name]));
    const categoryMap = new Map(master.categories.map((c) => [String(c.id), c.name]));

    const authorTranslitMap = translations?.authors?.transliterations || {};
    const bookTranslitMap = translations?.books?.transliterations || {};
    const categoryTranslitMap = translations?.categories?.transliterations || {};

    const hasTransliterations = Object.keys(bookTranslitMap).length > 0;

    const books: BookRow[] = master.books
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
