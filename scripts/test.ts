import { Database } from 'bun:sqlite';

type Book = {
    id: number;
    name: string;
}

const exportBooks = async () => {
    let db = new Database('book.sqlite');
    const books = db.query('SELECT id,name FROM book').all() as Book[];

    db.close();

    const lines = books.map((b) => {
        let name = b.name.slice(0, b.name.indexOf(' - ط '));
        name = name.slice(0, name.indexOf(' ط '));

        return `B${b.id} - ${b.name}`;
    })

    Bun.write('books.txt', lines.join('\n'));
}

const exportAuthors = async () => {
    let db = new Database('author.sqlite');
    const books = db.query('SELECT id,name FROM author').all() as Book[];

    db.close();

    const lines = books.map((b) => {
        return `B${b.id} - ${b.name}`;
    })

    Bun.write('authors.txt', lines.join('\n'));
}

const exportCategories = async () => {
    let db = new Database('category.sqlite');
    const books = db.query('SELECT id,name FROM category').all() as Book[];

    db.close();

    const lines = books.map((b) => {
        return `B${b.id} - ${b.name}`;
    })

    Bun.write('categories.txt', lines.join('\n'));
}

void exportBooks;
await exportAuthors();
await exportCategories();
