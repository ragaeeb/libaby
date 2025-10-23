import { create } from 'zustand';

export type Page = { id: number; content: string; page?: number; part?: string; number?: string };

export type Title = { id: number; content: string; page: number; parent?: number };

export type BookData = { pages: Page[]; titles: Title[] };

type BookPagesStore = {
    bookData: Record<string, BookData>;
    setBookData: (bookId: string, data: BookData) => void;
    getBookData: (bookId: string) => BookData | undefined;
};

export const useBookPagesStore = create<BookPagesStore>((set, get) => ({
    bookData: {},
    getBookData: (bookId) => get().bookData[bookId],
    setBookData: (bookId, data) => set((state) => ({ bookData: { ...state.bookData, [bookId]: data } })),
}));
