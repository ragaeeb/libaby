'use server';

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

type AuthorDetails = {
    id: string;
    name: string;
    biography?: string;
    nameTransliteration?: string;
    deathYear?: string;
    bookCount: number;
    books: BookListItem[];
};

type BookListItem = { id: string; title: string; category: string };

const getDataDir = () => process.env.DATA_DIR || join(process.cwd(), 'data');

export const getAuthorDetails = async (library: string, authorId: string): Promise<AuthorDetails | null> => {
    const masterPath = join(getDataDir(), 'libraries', library, 'master.json');

    if (!existsSync(masterPath)) {
        return null;
    }

    const content = await readFile(masterPath, 'utf-8');
    const master: any = JSON.parse(content);

    const translationsPath = join(getDataDir(), 'libraries', library, 'master.en.json');
    let translations: any = null;

    if (existsSync(translationsPath)) {
        const translationsContent = await readFile(translationsPath, 'utf-8');
        translations = JSON.parse(translationsContent);
    }

    const author = master.authors.find((a: any) => String(a.id) === authorId);

    if (!author) {
        return null;
    }

    const categoryMap = new Map(master.categories.map((c: any) => [String(c.id), c.name]));

    const booksByAuthor = master.books
        .filter((b: any) => b.is_deleted === '0' && b.author === authorId)
        .map((b: any) => ({
            category: categoryMap.get(b.category) || b.category,
            categoryTransliteration: translations?.categories?.transliterations?.[b.category],
            id: String(b.id),
            title: b.name,
            titleTransliteration: translations?.books?.transliterations?.[b.id],
        }));

    return {
        biography: author.biography || undefined,
        bookCount: booksByAuthor.length,
        books: booksByAuthor,
        deathYear: author.death_text || undefined,
        id: String(author.id),
        name: author.name,
        nameTransliteration: translations?.authors?.transliterations?.[author.id],
    };
};

export const getCategoryDetails = async (library: string, categoryId: string) => {
    const masterPath = join(getDataDir(), 'libraries', library, 'master.json');

    if (!existsSync(masterPath)) {
        return null;
    }

    const content = await readFile(masterPath, 'utf-8');
    const master: any = JSON.parse(content);

    const translationsPath = join(getDataDir(), 'libraries', library, 'master.en.json');
    let translations: any = null;

    if (existsSync(translationsPath)) {
        const translationsContent = await readFile(translationsPath, 'utf-8');
        translations = JSON.parse(translationsContent);
    }

    const category = master.categories.find((c: any) => String(c.id) === categoryId);

    if (!category) {
        return null;
    }

    const authorMap = new Map(master.authors.map((a: any) => [String(a.id), a.name]));

    const booksInCategory = master.books
        .filter((b: any) => b.is_deleted === '0' && b.category === categoryId)
        .map((b: any) => ({
            author: authorMap.get(b.author) || b.author,
            authorId: b.author,
            authorTransliteration: translations?.authors?.transliterations?.[b.author],
            id: String(b.id),
            title: b.name,
            titleTransliteration: translations?.books?.transliterations?.[b.id],
        }));

    return {
        bookCount: booksInCategory.length,
        books: booksInCategory,
        id: String(category.id),
        name: category.name,
        nameTransliteration: translations?.categories?.transliterations?.[category.id],
    };
};
