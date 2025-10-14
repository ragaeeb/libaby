export type LibraryConfig = { shamela?: string; turath?: string };

export type Book = {
    id: number;
    externalId: string;
    library: string;
    title: string;
    author: string;
    description?: string | null;
    chapters?: number | null;
    pages?: number | null;
    downloadedAt?: Date | null;
};

export type BookContent = {
    id: number;
    bookId: number;
    chapterNumber: number;
    chapterTitle?: string | null;
    content: string;
};

export type Repository = {
    getConfig: () => Promise<LibraryConfig>;
    setConfig: (config: LibraryConfig) => Promise<void>;

    listBooks: (library: string) => Promise<Book[]>;
    getBook: (library: string, externalId: string) => Promise<Book | null>;
    saveBook: (book: Omit<Book, 'id'>) => Promise<Book>;

    getBookContent: (bookId: number) => Promise<BookContent[]>;
    saveBookContent: (content: Omit<BookContent, 'id'>[]) => Promise<void>;

    searchBooks: (query: string) => Promise<Book[]>;
};
