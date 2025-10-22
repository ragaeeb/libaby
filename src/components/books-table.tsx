import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Book = {
    id: string;
    title: string;
    titleTransliteration?: string;
    author?: string;
    authorId?: string;
    authorTransliteration?: string;
    category?: string;
    categoryTransliteration?: string;
};

type BooksTableProps = { books: Book[]; showAuthor?: boolean; showCategory?: boolean };

export const BooksTable = ({ books, showAuthor = false, showCategory = false }: BooksTableProps) => (
    <div className="rounded-lg border">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="text-right">العنوان</TableHead>
                    {showAuthor && (
                        <>
                            <TableHead>Author</TableHead>
                            <TableHead className="text-right">المؤلف</TableHead>
                        </>
                    )}
                    {showCategory && (
                        <>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">التصنيف</TableHead>
                        </>
                    )}
                </TableRow>
            </TableHeader>
            <TableBody>
                {books.map((book) => (
                    <TableRow key={book.id} className="hover:bg-muted/50">
                        <TableCell>
                            <Link href={`/libraries/shamela/book/${book.id}`} className="hover:underline">
                                {book.titleTransliteration || '—'}
                            </Link>
                        </TableCell>
                        <TableCell className="text-right">
                            <Link href={`/libraries/shamela/book/${book.id}`} className="hover:underline">
                                {book.title}
                            </Link>
                        </TableCell>
                        {showAuthor && (
                            <>
                                <TableCell>
                                    {book.authorId ? (
                                        <Link
                                            href={`/libraries/shamela/author/${book.authorId}`}
                                            className="text-muted-foreground hover:underline"
                                        >
                                            {book.authorTransliteration || '—'}
                                        </Link>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            {book.authorTransliteration || '—'}
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {book.authorId ? (
                                        <Link
                                            href={`/libraries/shamela/author/${book.authorId}`}
                                            className="text-muted-foreground hover:underline"
                                        >
                                            {book.author}
                                        </Link>
                                    ) : (
                                        <span className="text-muted-foreground">{book.author}</span>
                                    )}
                                </TableCell>
                            </>
                        )}
                        {showCategory && (
                            <>
                                <TableCell>
                                    <span className="text-muted-foreground">{book.categoryTransliteration || '—'}</span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className="text-muted-foreground">{book.category}</span>
                                </TableCell>
                            </>
                        )}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
);
