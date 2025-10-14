## Getting Started

[![wakatime](https://wakatime.com/badge/user/a0b906ce-b8e7-4463-8bce-383238df6d4b/project/8cad7ba0-b573-456e-b621-2baacba0a781.svg)](https://wakatime.com/badge/user/a0b906ce-b8e7-4463-8bce-383238df6d4b/project/8cad7ba0-b573-456e-b621-2baacba0a781)
[![Vercel Deploy](https://deploy-badge.vercel.app/vercel/libaby)](https://libaby.vercel.app)
[![typescript](https://badgen.net/badge/icon/typescript?icon=typescript&label&color=blue)](https://www.typescriptlang.org)
[![Node.js CI](https://github.com/ragaeeb/libaby/actions/workflows/build.yml/badge.svg)](https://github.com/ragaeeb/libaby/actions/workflows/build.yml)
![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)
![GitHub License](https://img.shields.io/github/license/ragaeeb/libaby)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

```bash
bun dev
```

# Setup Instructions

## Database Setup

1. Install dependencies:
```bash
bun install
```

2. Generate migration (if needed):
```bash
bun drizzle-kit generate
```

3. The database will be automatically initialized on first run at `data/libaby.db`

## Project Structure

- `src/db/` - Database schema and client
- `src/lib/repository/` - Repository pattern abstraction
  - `interface.ts` - Repository interface (swap implementations here)
  - `sqlite.ts` - SQLite implementation
  - `index.ts` - Factory to get repository
- `src/actions/` - Server actions for Next.js
  - `config.ts` - Configuration management
  - `books.ts` - Book operations

## Architecture Notes

### Repository Pattern
The repository pattern allows easy swapping of data sources:
- Currently uses SQLite with Drizzle ORM
- To switch to MongoDB/Postgres: create new implementation following `interface.ts`
- Update `getRepository()` in `src/lib/repository/index.ts`

### Server Actions vs API Routes
Using **Server Actions** for:
- Direct function calls (no HTTP overhead)
- AI agents can call them directly
- Type-safe by default
- Automatic serialization

### Full-Text Search
SQLite FTS5 is configured in the migration:
- `book_content_fts` virtual table
- Automatic triggers keep FTS index in sync
- Ready for `MATCH` queries

### Future Integrations
- **Meilisearch**: Can add as alternative search implementation
- **AI Agents**: Server actions are already agent-ready
- **Cloud Deploy**: Same codebase works locally or deployed
- **Database Migration**: Just implement new Repository and swap in factory

## Running

```bash
bun run dev
```

The app will:
1. Initialize database on first run
2. Create `data/libaby.db`
3. Apply migrations automatically
