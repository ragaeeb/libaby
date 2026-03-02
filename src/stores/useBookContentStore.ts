import { create } from "zustand";
import type { BookData } from "@/types/books";

type BookContentState = {
  bookId: number | null;
  data: BookData | null;
  loading: boolean;
  error: string | null;
  setData: (bookId: number, data: BookData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

export const useBookContentStore = create<BookContentState>((set) => ({
  bookId: null,
  data: null,
  error: null,
  loading: false,
  reset: () => set({ bookId: null, data: null, error: null, loading: false }),
  setData: (bookId, data) => set({ bookId, data, error: null, loading: false }),
  setError: (error) => set({ error, loading: false }),
  setLoading: (loading) => set({ loading }),
}));
