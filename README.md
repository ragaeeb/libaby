# Libaby 📚

[![wakatime](https://wakatime.com/badge/user/a0b906ce-b8e7-4463-8bce-383238df6d4b/project/8cad7ba0-b573-456e-b621-2baacba0a781.svg)](https://wakatime.com/badge/user/a0b906ce-b8e7-4463-8bce-383238df6d4b/project/8cad7ba0-b573-456e-b621-2baacba0a781)
[![Vercel Deploy](https://deploy-badge.vercel.app/vercel/libaby)](https://libaby.vercel.app)
[![typescript](https://badgen.net/badge/icon/typescript?icon=typescript&label&color=blue)](https://www.typescriptlang.org)
[![Node.js CI](https://github.com/ragaeeb/libaby/actions/workflows/build.yml/badge.svg)](https://github.com/ragaeeb/libaby/actions/workflows/build.yml)
![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)
![GitHub License](https://img.shields.io/github/license/ragaeeb/libaby)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, local-first Islamic library management system for studying and researching Islamic texts. Built with Next.js, TypeScript, and Meilisearch.

## Overview

Libaby enables users to build and manage their personal Islamic library locally without hosting requirements. Access books from multiple Islamic digital libraries (Shamela, Turath) and manage them in a unified interface. Deploy locally for offline use or host in the cloud - same codebase, your choice.

## Features

- **Multi-Library Support**: Connect to Shamela (shamela.ws) and Turath (turath.io) libraries
- **Local-First Architecture**: All data stored locally with no external dependencies
- **Book Management**: Browse, download, and organize Islamic texts with transliteration support
- **Advanced Search**: Meilisearch-powered full-text search with Arabic diacritics support and fuzzy matching
  - Global search across all downloaded books
  - Book-specific search for targeted research
  - RTL (Right-to-Left) interface for Arabic content
- **Smart Content Display**: 
  - Automatic title extraction and highlighting
  - Proper RTL text formatting
  - Multi-line content wrapping in tables
  - Footnote separation
- **Modern UI**: Clean interface with collapsible sidebar navigation, breadcrumb trails, and responsive design
- **Cloud-Ready**: Deployable to Vercel or any platform with minimal configuration

## Tech Stack

- **Framework**: Next.js 16 with App Router and Turbopack
- **Runtime**: Bun (>=1.3.0)
- **Node.js**: 22.x LTS recommended for Node-based deployments
- **UI**: React 19, Tailwind CSS, shadcn/ui, Radix UI
- **Search**: Meilisearch with Arabic language support
- **State Management**: Zustand for client state, Server Actions for data fetching
- **Data Layer**: JSON-based storage with in-memory caching

## Getting Started

### Prerequisites

1. **Bun** (>=1.3.0): [Install Bun](https://bun.sh)
2. **Meilisearch**: Choose one installation method below

### Meilisearch Installation

#### Option 1: Binary (No Docker Required) - Recommended for Local Dev

**macOS (Homebrew):**
```bash
brew install meilisearch
```

**Linux:**
```bash
curl -L https://install.meilisearch.com | sh
```

**Windows:**
Download from [Meilisearch Releases](https://github.com/meilisearch/meilisearch/releases)

**Start Meilisearch:**
```bash
meilisearch --master-key="masterKey"
```

#### Option 2: Docker

```bash
docker-compose up -d
```

### Installation

```bash
# Clone the repository
git clone https://github.com/ragaeeb/libaby.git
cd libaby

# Install dependencies
bun install

# Copy environment configuration
cp .env.example .env
```

### Configuration

Edit `.env` with your settings:

```bash
DATA_DIR=./data
SHAMELA_API_KEY=your_shamela_key
SHAMELA_BOOKS_ENDPOINT=https://shamela.ws/api/books
SHAMELA_MASTER_ENDPOINT=https://shamela.ws/api/master
MEILI_HOST=http://localhost:7700
MEILI_MASTER_KEY=masterKey
```

### Running the Application

1. **Start Meilisearch** (in a separate terminal):
   ```bash
   meilisearch --master-key="masterKey"
   ```

2. **Start the development server**:
   ```bash
   bun run dev
   ```

3. Visit `http://localhost:3000`

4. **Configure Library Access**:
   - Navigate to Settings (`/settings`)
   - Add API keys for Shamela and/or Turath
   - Save configuration

5. **Download Books**:
   - Browse available books in the library
   - Click "Download Book" on any book page
   - Books are stored in `data/libraries/{library}/books/`

6. **Index Books for Search** (after downloading):
   ```bash
   bun run index
   ```

## Search Features

### Global Search (`/search`)
- Search across all downloaded books in your library
- Arabic text with full diacritics support
- Fuzzy matching for typo tolerance
- Results show book title, author, page number, and content preview
- Click any result to jump directly to that page

### Book-Specific Search
- Available on any book's pages view
- Filter pages within a single book
- Same powerful Meilisearch features
- Combine with table of contents navigation

### Search Best Practices

- Meilisearch automatically handles Arabic diacritics normalization
- Search works with both Arabic script and transliterations
- Re-run `bun run index` after downloading new books to update the search index
- Search queries support multi-word phrases and boolean logic

## Project Structure

```text
src/
├── actions/          # Server actions for Next.js
│   ├── authors.ts    # Author and category details
│   ├── book-download.ts  # Book download operations
│   ├── books.ts      # Book management
│   ├── config.ts     # Configuration management
│   ├── search.ts     # Meilisearch integration
│   └── shamela.ts    # Shamela library operations
├── app/              # Next.js App Router pages
│   ├── libraries/
│   │   └── shamela/
│   │       ├── author/[authorId]/   # Author pages
│   │       ├── book/[bookId]/       # Book details and pages
│   │       ├── category/[categoryId]/  # Category pages
│   │       └── page.tsx             # Library browse
│   ├── search/       # Global search page
│   └── settings/     # Configuration
├── components/       # React components
│   ├── app-sidebar.tsx           # Navigation sidebar
│   ├── page-header.tsx           # Breadcrumb header
│   ├── paginated-books-table.tsx # Reusable book table
│   └── ui/           # shadcn/ui components
├── lib/
│   ├── data/         # Consolidated data layer
│   │   └── index.ts  # Master data, config, downloads
│   ├── cache/        # In-memory caching
│   └── libraries/    # Library-specific integrations
└── stores/           # Zustand state management
    ├── useBookPagesStore.ts
    └── useLibraryStore.ts
```

## Architecture

### Data Layer

The application uses a consolidated data layer (`src/lib/data/index.ts`) that:
- Loads master library data (books, authors, categories)
- Caches data in memory with TTL (1 hour)
- Manages configuration and download tracking
- Handles transliterations for multilingual support

### Search Architecture

Meilisearch handles all full-text search with:
- Arabic language support with diacritics normalization
- Automatic word segmentation for agglutinated words
- Configurable ranking and relevance
- Fast indexing and search performance
- Scalable to millions of documents

Index structure:
```typescript
{
  id: string;              // Unique identifier
  bookId: string;          // Book reference
  bookTitle: string;       // Book name
  authorId: string;        // Author reference
  authorName: string;      // Author name
  pageId: number;          // Page number
  pageNumber?: string;     // Display page number
  content: string;         // Page content (searchable)
}
```

### Server Actions

Using **Server Actions** for:
- Direct function calls (no HTTP overhead)
- Type-safe by default
- Automatic serialization
- Progressive enhancement

## Database Management

### Data Storage

Data is stored in `./data/` by default:
- `config.json`: Library API configurations
- `downloaded.json`: Downloaded books tracking
- `libraries/{library}/master.json`: Library catalog
- `libraries/{library}/master.en.json`: Transliterations
- `libraries/{library}/books/*.json`: Book content
- `meili_data/`: Meilisearch index data

Override data directory:

```bash
# macOS/Linux
DATA_DIR=/custom/path bun run dev

# Windows (PowerShell)
$env:DATA_DIR = "/custom/path"; bun run dev
```

### Meilisearch Maintenance

**Re-index after downloading books:**
```bash
bun run index
```

**Stop Meilisearch:**
```bash
# Binary: Ctrl+C in terminal

# Docker:
docker-compose down

# Remove data:
docker-compose down -v
```

**Check Meilisearch health:**
Visit `http://localhost:7700/health`

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

The app can be deployed to any Node.js-compatible platform.

**Requirements:**
- Persistent storage for `DATA_DIR`
- Meilisearch instance (managed or self-hosted)
- Environment variables configured

**Environment Variables:**
```bash
DATA_DIR=/var/data
SHAMELA_API_KEY=xxx
MEILI_HOST=https://your-meilisearch-instance.com
MEILI_MASTER_KEY=xxx
```

**Meilisearch Hosting Options:**
- [Meilisearch Cloud](https://www.meilisearch.com/cloud) (managed)
- Self-host on Fly.io, Railway, DigitalOcean
- Docker container on any VPS

**Note:** Vercel's filesystem is ephemeral. For production, use:
- External storage volume for `DATA_DIR`
- Managed Meilisearch Cloud
- Or deploy to platforms with persistent storage (Fly.io, Railway)

Live demo: [libaby.vercel.app](https://libaby.vercel.app)

## Roadmap

### Completed ✅
- [x] Multi-library support (Shamela, Turath)
- [x] Book download and management
- [x] Full-text search with Meilisearch
- [x] Arabic diacritics support
- [x] RTL content display
- [x] Author and category pages
- [x] Transliteration support
- [x] Global and book-specific search
- [x] Zustand state management

### Near Term
- [ ] User notes and annotations per book/page
- [ ] Bookmarks and reading progress
- [ ] Tag system for organizing content
- [ ] Search filters (author, category, date range)
- [ ] Export/import library data
- [ ] Dark mode support
- [ ] Advanced page navigation (jump to page, TOC)

### Future Integrations
- [ ] **AI Agents**: Server actions are already agent-ready for research assistance
- [ ] **Alternative Search**: Option to use SQLite FTS5, Typesense
- [ ] **Offline PWA**: Progressive Web App support
- [ ] **Multi-User**: Authentication and cloud sync
- [ ] **Mobile Apps**: React Native or Tauri desktop/mobile
- [ ] **API**: RESTful API for third-party integrations

## Troubleshooting

### Search Not Working
1. Ensure Meilisearch is running: `http://localhost:7700`
2. Check environment variables in `.env`
3. Run indexing: `bun run index`
4. Check Meilisearch logs for errors

### Books Not Appearing
1. Verify API keys in Settings
2. Check `data/downloaded.json` exists
3. Ensure book files exist in `data/libraries/{library}/books/`

### Performance Issues
1. Meilisearch index might be rebuilding (check logs)
2. Clear cache and restart: delete `data/meili_data/`
3. Increase Meilisearch memory limit if needed

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes with semantic commit messages
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a pull request

### Development Guidelines
- Use TypeScript for all new code
- Follow existing code style (Biome formatter)
- Add types for all functions and components
- Prefer arrow functions
- Minimize re-renders with proper memoization
- Use Server Actions for data operations

## License

MIT License - see [LICENSE](LICENSE)

## Support

- **Issues**: [github.com/ragaeeb/libaby/issues](https://github.com/ragaeeb/libaby/issues)
- **Discussions**: [github.com/ragaeeb/libaby/discussions](https://github.com/ragaeeb/libaby/discussions)
- **Repository**: [github.com/ragaeeb/libaby](https://github.com/ragaeeb/libaby)

## Acknowledgments

Built with [Next.js](https://nextjs.org), [Meilisearch](https://www.meilisearch.com), [shadcn/ui](https://ui.shadcn.com), and [Bun](https://bun.sh).

Special thanks to the Islamic digital library communities at Shamela and Turath for providing access to classical texts.

---

**Note**: This is early-stage software. APIs and data formats may change between versions.