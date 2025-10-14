'use server';

import { type Book, getRepository } from '@/lib/repository';

type BookListItem = { id: string; title: string; author: string };

const SHAMELA_MOCK_DATA: Record<string, Omit<Book, 'id'>> = {
    '335': {
        author: 'Imam al-Bukhari',
        chapters: 97,
        description:
            'The most authentic collection of hadith in Islamic tradition, compiled by Imam Muhammad ibn Ismail al-Bukhari.',
        downloadedAt: null,
        externalId: '335',
        library: 'shamela',
        pages: 4234,
        title: 'Sahih al-Bukhari',
    },
    '336': {
        author: 'Imam Muslim',
        chapters: 54,
        description: 'The second most authentic hadith collection, compiled by Imam Muslim ibn al-Hajjaj.',
        downloadedAt: null,
        externalId: '336',
        library: 'shamela',
        pages: 3842,
        title: 'Sahih Muslim',
    },
    '337': {
        author: 'Imam Abu Dawud',
        chapters: 43,
        description: 'One of the six major hadith collections, focusing on legal hadith.',
        downloadedAt: null,
        externalId: '337',
        library: 'shamela',
        pages: 2156,
        title: 'Sunan Abu Dawud',
    },
    '338': {
        author: 'Imam at-Tirmidhi',
        chapters: 50,
        description: 'A comprehensive hadith collection with grading of narrations.',
        downloadedAt: null,
        externalId: '338',
        library: 'shamela',
        pages: 1987,
        title: 'Jami at-Tirmidhi',
    },
    '339': {
        author: "Imam an-Nasa'i",
        chapters: 51,
        description: 'Known for its rigorous authentication standards.',
        downloadedAt: null,
        externalId: '339',
        library: 'shamela',
        pages: 2543,
        title: "Sunan an-Nasa'i",
    },
    '340': {
        author: 'Imam Ibn Majah',
        chapters: 37,
        description: 'The sixth book of the Kutub al-Sittah collection.',
        downloadedAt: null,
        externalId: '340',
        library: 'shamela',
        pages: 1876,
        title: 'Sunan Ibn Majah',
    },
};

const TURATH_MOCK_DATA: Record<string, Omit<Book, 'id'>> = {
    '501': {
        author: 'Imam al-Tabari',
        chapters: 30,
        description:
            'Comprehensive Quranic exegesis by one of the greatest Islamic scholars, known for its detailed historical and linguistic analysis.',
        downloadedAt: null,
        externalId: '501',
        library: 'turath',
        pages: 8542,
        title: 'Tafsir al-Tabari',
    },
    '502': {
        author: 'Ibn Kathir',
        chapters: 30,
        description:
            'One of the most respected tafsir works, interpreting the Quran through hadith and scholarly consensus.',
        downloadedAt: null,
        externalId: '502',
        library: 'turath',
        pages: 4231,
        title: 'Tafsir Ibn Kathir',
    },
    '503': {
        author: 'Ibn Kathir',
        chapters: 14,
        description:
            "A comprehensive history of the world from creation to the author's time, including prophetic history.",
        downloadedAt: null,
        externalId: '503',
        library: 'turath',
        pages: 6789,
        title: 'Al-Bidaya wan-Nihaya',
    },
    '504': {
        author: 'Ibn Hajar al-Asqalani',
        chapters: 97,
        description: 'The most comprehensive commentary on Sahih al-Bukhari, indispensable for hadith scholarship.',
        downloadedAt: null,
        externalId: '504',
        library: 'turath',
        pages: 7234,
        title: 'Fath al-Bari',
    },
    '505': {
        author: 'Imam an-Nawawi',
        chapters: 54,
        description: 'Authoritative commentary on Sahih Muslim, explaining hadith meanings and legal rulings.',
        downloadedAt: null,
        externalId: '505',
        library: 'turath',
        pages: 5432,
        title: 'Sharh Sahih Muslim',
    },
};

export const getLibraryBooks = async (library: string): Promise<BookListItem[]> => {
    const mockData = library === 'shamela' ? SHAMELA_MOCK_DATA : TURATH_MOCK_DATA;

    return Object.entries(mockData).map(([id, book]) => ({ author: book.author, id, title: book.title }));
};

export const getBookDetails = async (library: string, bookId: string): Promise<Book | null> => {
    const repo = getRepository();

    let book = await repo.getBook(library, bookId);

    if (!book) {
        const mockData = library === 'shamela' ? SHAMELA_MOCK_DATA : TURATH_MOCK_DATA;
        const mockBook = mockData[bookId];

        if (!mockBook) {
            return null;
        }

        book = { id: 0, ...mockBook };
    }

    return book;
};

export const downloadBook = async (library: string, bookId: string): Promise<void> => {
    const repo = getRepository();

    const mockData = library === 'shamela' ? SHAMELA_MOCK_DATA : TURATH_MOCK_DATA;
    const mockBook = mockData[bookId];

    if (!mockBook) {
        throw new Error('Book not found');
    }

    await repo.saveBook({ ...mockBook, downloadedAt: new Date() });
};
