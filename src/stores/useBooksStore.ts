import { create } from "zustand";
import type { DenormalizedBook } from "@/types/books";

type BooksState = {
  books: DenormalizedBook[];
  loading: boolean;
  error: string | null;
  setBooks: (books: DenormalizedBook[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

export const useBooksStore = create<BooksState>((set) => ({
  books: [],
  error: null,
  loading: false,
  reset: () => set({ books: [], error: null, loading: false }),
  setBooks: (books) => set({ books, error: null, loading: false }),
  setError: (error) => set({ error, loading: false }),
  setLoading: (loading) => set({ loading }),
}));
