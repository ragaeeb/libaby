import { create } from 'zustand';

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

type LibraryStore = {
    books: BookRow[];
    hasTransliterations: boolean;
    isLoaded: boolean;
    setBooks: (books: BookRow[], hasTransliterations: boolean) => void;
};

export const useLibraryStore = create<LibraryStore>((set) => ({
    books: [],
    hasTransliterations: false,
    isLoaded: false,
    setBooks: (books, hasTransliterations) => set({ books, hasTransliterations, isLoaded: true }),
}));
