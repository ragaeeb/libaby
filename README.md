# Libaby 📚

[![wakatime](https://wakatime.com/badge/user/a0b906ce-b8e7-4463-8bce-383238df6d4b/project/8cad7ba0-b573-456e-b621-2baacba0a781.svg)](https://wakatime.com/badge/user/a0b906ce-b8e7-4463-8bce-383238df6d4b/project/8cad7ba0-b573-456e-b621-2baacba0a781)
[![Vercel Deploy](https://deploy-badge.vercel.app/vercel/libaby)](https://libaby.vercel.app)
[![typescript](https://badgen.net/badge/icon/typescript?icon=typescript&label&color=blue)](https://www.typescriptlang.org)
[![Node.js CI](https://github.com/ragaeeb/libaby/actions/workflows/build.yml/badge.svg)](https://github.com/ragaeeb/libaby/actions/workflows/build.yml)
![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)
![GitHub License](https://img.shields.io/github/license/ragaeeb/libaby)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, local-first Islamic library management system for studying and researching Islamic texts. Built with Next.js, TypeScript, and SQLite.

## Overview

Libaby enables users to build and manage their personal Islamic library locally without hosting requirements. Access books from multiple Islamic digital libraries (Shamela, Turath) and manage them in a unified interface. Deploy locally for offline use or host in the cloud - same codebase, your choice.

## Features

- **Multi-Library Support**: Connect to Shamela (shamela.ws) and Turath (turath.io) libraries
- **Local-First Architecture**: All data stored locally in SQLite with no external dependencies
- **Book Management**: Browse, download, and organize Islamic texts
- **Full-Text Search**: Built on SQLite FTS5 for fast, comprehensive searches across books
- **Modern UI**: Clean interface with collapsible sidebar navigation and breadcrumb trails
- **Cloud-Ready**: Deployable to Vercel or any platform with minimal configuration

## Tech Stack

- **Framework**: Next.js 15 with App Router and Turbopack
- **Runtime**: Bun (>=1.3.0)
- **Node.js**: 22.x LTS recommended for Node-based deployments
- **Database**: SQLite with better-sqlite3 and Drizzle ORM
- **UI**: React 19, Tailwind CSS, shadcn/ui, Radix UI
- **Search**: SQLite FTS5 (extensible to Meilisearch, Typesense, etc.)
- **State Management**: Server Actions (planned: React Query + Zustand)

## Getting Started

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

Visit `http://localhost:3000`

The app will automatically:
1. Initialize database on first run
2. Create `data/libaby.db`
3. Apply migrations

## Configuration

1. Navigate to Settings (`/settings`)
2. Add API keys for desired libraries:
   - **Shamela**: Get API key from shamela.ws
   - **Turath**: Get API key from turath.io
3. Save configuration

Libraries will appear in the sidebar once configured.

## Project Structure

```text
src/
├── actions/          # Server actions for Next.js
│   ├── config.ts     # Configuration management
│   └── books.ts      # Book operations
├── app/              # Next.js App Router pages
├── components/       # React components
├── db/               # Database schema and client
│   ├── index.ts      # Database initialization
│   └── schema.ts     # Drizzle schema definitions
└── lib/
    └── repository/   # Repository pattern abstraction
        ├── interface.ts  # Repository interface (swap implementations here)
        ├── sqlite.ts     # SQLite implementation
        └── index.ts      # Factory to get repository
```

## Architecture

### Repository Pattern

The repository pattern allows easy swapping of data sources:

```typescript
interface Repository {
  getConfig(): Promise<LibraryConfig>;
  setConfig(config: LibraryConfig): Promise<void>;
  listBooks(library: string): Promise<Book[]>;
  getBook(library: string, externalId: string): Promise<Book | null>;
  saveBook(book: Omit<Book, 'id'>): Promise<Book>;
  getBookContent(bookId: number): Promise<BookContent[]>;
  saveBookContent(content: Omit<BookContent, 'id'>[]): Promise<void>;
  searchBooks(query: string): Promise<Book[]>;
}
```

- Currently uses SQLite with Drizzle ORM
- To switch to MongoDB/Postgres: create new implementation following `interface.ts`
- Update `getRepository()` in `src/lib/repository/index.ts`

### Server Actions vs API Routes

Using **Server Actions** for:
- Direct function calls (no HTTP overhead)
- AI agents can call them directly
- Type-safe by default
- Automatic serialization

### Database Schema

- **config**: Library API configurations (Shamela, Turath keys)
- **books**: Book metadata (title, author, chapters, pages, download status)
- **book_content**: Full text content per chapter
- **book_content_fts**: FTS5 virtual table for full-text search with automatic triggers

### Full-Text Search

SQLite FTS5 is configured in the migration:
- `book_content_fts` virtual table
- Automatic triggers keep FTS index in sync
- Ready for `MATCH` queries
- Extensible to Meilisearch, Typesense, or other search engines

## Database Management

### Generate Migration
```bash
bun drizzle-kit generate
```

### Apply Migrations
Migrations are applied automatically on startup. Manual application:
```bash
bun drizzle-kit migrate
```

### Data Storage

Data is stored in `./data/libaby.db` by default. Override with:

```bash
# macOS/Linux
DATA_DIR=/custom/path bun run dev
# Windows (PowerShell)
$env:DATA_DIR = "/custom/path"; bun run dev
```

## Development

### Code Quality

```bash
# Format code
bun run format

# Lint
bun run lint
```

### Production Build

```bash
bun run build
bun run start
```

## Deployment

### Vercel / Cloud Platforms

The app can be deployed to any Node.js-compatible platform. For SQLite persistence, use platforms with persistent storage (Fly.io, Railway, DigitalOcean App Platform).

Note: Vercel’s filesystem is ephemeral; SQLite files won’t persist across deploys. Use an external volume/storage or a different host if you need persistence.

**Environment Variables:**
- `DATA_DIR`: Path to store database (default: `./data`)

Live demo: [libaby.vercel.app](https://libaby.vercel.app)

## Roadmap

### Near Term
- [ ] React Query + Zustand state management
- [ ] User notes and annotations per book/page
- [ ] Tag system for organizing content
- [ ] Advanced FTS search with filters
- [ ] Export/import library data

### Future Integrations
- [ ] **AI Agents**: Server actions are already agent-ready for research assistance
- [ ] **Multi-Database**: PostgreSQL, MongoDB support
- [ ] **Alternative Search**: Meilisearch, Typesense integration
- [ ] **Offline PWA**: Progressive Web App support
- [ ] **Multi-User**: Authentication and cloud sync
- [ ] **Cloud Migration**: Same codebase works locally or deployed

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit changes with semantic commit messages
4. Open a pull request

## License

MIT License - see [LICENSE](LICENSE)

## Support

- **Issues**: [github.com/ragaeeb/libaby/issues](https://github.com/ragaeeb/libaby/issues)
- **Repository**: [github.com/ragaeeb/libaby](https://github.com/ragaeeb/libaby)

## Acknowledgments

Built with [Next.js](https://nextjs.org), [Drizzle ORM](https://orm.drizzle.team), [shadcn/ui](https://ui.shadcn.com), and [Bun](https://bun.sh).

---

**Note**: This is early-stage software. APIs and database schema may change between versions.