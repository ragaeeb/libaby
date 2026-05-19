# Libaby 📚

[![wakatime](https://wakatime.com/badge/user/a0b906ce-b8e7-4463-8bce-383238df6d4b/project/8cad7ba0-b573-456e-b621-2baacba0a781.svg)](https://wakatime.com/badge/user/a0b906ce-b8e7-4463-8bce-383238df6d4b/project/8cad7ba0-b573-456e-b621-2baacba0a781)
[![typescript](https://badgen.net/badge/icon/typescript?icon=typescript&label&color=blue)](https://www.typescriptlang.org)
[![Node.js CI](https://github.com/ragaeeb/libaby/actions/workflows/build.yml/badge.svg)](https://github.com/ragaeeb/libaby/actions/workflows/build.yml)
![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)
![GitHub License](https://img.shields.io/github/license/ragaeeb/libaby)

A local-first desktop application for browsing, downloading, and reading Islamic texts from the Shamela library. Built with Tauri 2, React 19, and Rust.

## Overview

Libaby downloads the Shamela library catalogue from a private HuggingFace dataset and lets you browse all books, download individual books locally, and read them with full bilingual (Arabic + English transliteration) support. Everything is stored on disk — no external server is required after the initial download.

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri 2](https://tauri.app) |
| Frontend | React 19, TypeScript, Vite 8, Bun |
| UI components | [shadcn/ui](https://ui.shadcn.com) (Radix UI + Tailwind CSS) |
| Backend / IPC | Rust (`src-tauri/src/`) |
| Package manager | Bun ≥ 1.3.10 |
| Rust toolchain | Stable (via `rustup`) |
| Data source | HuggingFace private dataset (brotli-compressed JSON) |

## Features

- **Browse Shamela catalogue** — search across 10 000+ books with Arabic diacritic normalisation, macron stripping, and numeric ID lookup.
- **Bilingual interface** — toggle between English transliteration and Arabic. All book names, authors, and categories are shown in both scripts.
- **Offline reading** — books are downloaded once, stored as JSON, and read locally. No network needed after download.
- **Translation support** — if an English translation file exists on HuggingFace (`books/en/{id}.json.br`), it can be downloaded and shown alongside the Arabic text in a two-column layout.
- **Citation copy** — each translated page has a Copy button that formats the text + Arabic-Indic numerals citation + Shamela URL to the clipboard.
- **Sidebar table-of-contents** — books are expanded in the sidebar with their chapter/section tree for quick navigation.

## Prerequisites

1. **Bun** ≥ 1.3.10 — [bun.sh](https://bun.sh)
2. **Rust stable** — `rustup toolchain install stable`
3. **Tauri system deps** — [tauri.app/v2/guides/prerequisites](https://tauri.app/v2/guides/prerequisites/) (platform-specific)
4. **HuggingFace access token** — read permission to the private Shamela dataset
5. **Shamela HuggingFace dataset name** — e.g. `ragaeeb/shamela`

## Getting Started

```bash
git clone https://github.com/ragaeeb/libaby.git
cd libaby
bun install
bun run dev          # starts Vite + Tauri dev window
```

On first launch:
1. Open **Settings** and enter your HuggingFace token and dataset name.
2. Go to the **Dashboard** and click **Download Master Database** (≈40 MB, downloads `master/master.json.br` + `master/master_en.json.br`).
3. Browse books in **Shamela → Books**, click a book, then **Download Book**.
4. Click **View Pages** to read. If a translation is available, **Download Translation** will appear.

## Available Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start Vite dev server + Tauri window |
| `bun run build` | Production Tauri build |
| `bun run vite:build` | TypeScript check + Vite bundle only |
| `bun run ci` | Vite build + `cargo check` (used in CI) |
| `bun run lint` | Biome lint |
| `bun run lint:fix` | Biome lint with auto-fix |
| `bun run format` | Biome format check |
| `bun run format:fix` | Biome format with auto-fix |
| `bun run upgrade:tauri` | Sync Tauri NPM + Rust crate versions (see below) |

## Project Structure

```text
libaby/
├── src/                          # React frontend
│   ├── components/
│   │   ├── application-shell1.tsx  # Root shell: routing, sidebar, breadcrumbs
│   │   ├── page-layout.tsx         # Shared page wrapper
│   │   └── ui/                     # shadcn/ui primitives
│   ├── lib/
│   │   ├── book-resource.ts        # BookResource builder (pages, titles, index)
│   │   ├── book-resource-store.ts  # LRU cache for BookResource instances
│   │   ├── book-translation.ts     # EnExcerpt types, TranslationIndex builder, Tauri wrappers
│   │   ├── huggingface.ts          # All Tauri command wrappers (invoke calls)
│   │   ├── io.ts                   # File I/O helpers
│   │   ├── shamela-content.tsx     # Arabic content → markdown → React renderer
│   │   ├── shamela-tree.ts         # Title node tree builder for sidebar
│   │   └── utils.ts               # cn() and misc helpers
│   ├── pages/
│   │   ├── DashboardPage.tsx       # Stats + download master
│   │   ├── SettingsPage.tsx        # HuggingFace token + dataset config
│   │   ├── ShamelaPage.tsx         # Paginated books table with search + language toggle
│   │   ├── BookDetailPage.tsx      # Book info + download book/translation buttons
│   │   ├── BookPagesPage.tsx       # Paginated table of all pages in a book
│   │   └── BookPageView.tsx        # Single page reader with bilingual layout + citation
│   ├── stores/
│   │   ├── useSettingsStore.ts     # Zustand: HF token, dataset, validation state
│   │   ├── useBooksStore.ts        # Zustand: downloaded book IDs cache
│   │   └── useBookContentStore.ts  # Zustand: in-memory book content cache
│   └── types/
│       └── books.ts                # DenormalizedBook (extends shamela npm types with en_* fields)
│
├── src-tauri/
│   ├── src/
│   │   ├── main.rs                 # Tauri entry point
│   │   ├── lib.rs                  # All Tauri commands + app state
│   │   └── catalog.rs             # MasterIndex: search, normalisation, EN injection
│   └── Cargo.toml                 # Rust dependencies
│
├── scripts/
│   ├── upgrade-tauri.sh           # Sync Tauri NPM + Rust crate versions
│   └── sync-version.mjs           # Sync package.json version → Cargo.toml
│
└── docs/                          # Architecture notes and comparisons
```

## Architecture Notes

### Data Flow

```
HuggingFace dataset (private)
  └─ master/master.json.br         → master.json (local)
  └─ master/master_en.json.br      → master_en.json (local)
  └─ books/{id}.json.br            → books/{id}.json (local)
  └─ books/en/{id}.json.br         → books/en/{id}.json (local, optional)

Rust (catalog.rs)
  MasterIndex { books: Vec<DenormalizedBook>, search_entries: Vec<SearchEntry> }
  ↳ builds normalised search blob per book (strips diacritics/macrons, includes numeric ID)
  ↳ injects en_name / en_author / en_category from master_en.json at index build time

Tauri IPC (lib.rs commands)
  ↳ query_master_books(params)        → paginated + filtered book list
  ↳ download_and_cache_book(id)       → fetches books/{id}.json.br, stores locally
  ↳ read_cached_book_if_exists(id)    → reads books/{id}.json
  ↳ download_and_cache_book_translation(id) → fetches books/en/{id}.json.br
  ↳ read_cached_book_translation_if_exists  → reads books/en/{id}.json

React frontend
  ↳ huggingface.ts  wraps every invoke() call with typed promises
  ↳ book-resource.ts  parses raw BookData → BookResource (pageById, pageIndexById, titleTree)
  ↳ book-resource-store.ts  LRU cache (max 6) so repeat page navigations skip re-parsing
  ↳ book-translation.ts  parses translation JSON → TranslationIndex (Map<pageId, EnExcerpt[]>)
```

### Route Model

The shell uses a discriminated union `Route` type. Navigation is purely in-memory — no URL router. `enrichRoute` fills in missing `bookTitle`/`bookArTitle` from `knownBookTitles` when navigating from the sidebar.

```typescript
type Route =
  | { page: "dashboard" }
  | { page: "settings" }
  | { page: "shamela-books" }
  | { page: "shamela-book";       bookId: number; bookTitle?: string; bookArTitle?: string }
  | { page: "shamela-book-pages"; bookId: number; bookTitle?: string; bookArTitle?: string }
  | { page: "shamela-book-page";  bookId: number; pageId: number; pageNumber?: string | number;
                                   bookTitle?: string; bookArTitle?: string }
```

### Key Design Decisions

- **`useEffectEvent` functions must never be in `useEffect` deps arrays** — they are not stable references in all React builds. Only primitive values (strings, booleans, numbers) should be deps.
- **`bookMeta` is memoized in `BookPageViewWrapper`** — prevents `BookPageView` re-rendering on every parent render, which would re-run expensive `ShamelaContent` markdown parsing.
- **Translation index is keyed by `bookId`, not `pageId`** — the translation effect fires once per book, not on every page navigation.
- **`setKnownBookTitles` bails out when nothing changes** — returns `current` reference to avoid re-renders when `refreshDownloadedBooks` polls with unchanged data.

## Data Formats

### `master.json` (root object)
```jsonc
{
  "books": [
    {
      "id": 1681,
      "name": "صحيح البخاري",
      "author": { "id": 55, "name": "محمد بن إسماعيل البخاري" },
      "category": { "id": 23, "name": "الحديث" },
      "printed": 1,
      "version": "5.0",   // NOTE: may be a string float — handled in Rust
      ...
    }
  ]
}
```

### `master_en.json` (translations)
```jsonc
{
  "headings": [{ "id": "A55", "text": "Muḥammad ibn Ismāʿīl al-Bukhārī" }],
  "footnotes": [{ "id": "C23", "text": "Hadith" }],
  "excerpts": [{ "id": "B1681", "text": "Ṣaḥīḥ al-Bukhārī" }]
}
```
- `A{n}` → `authors.id = n`
- `C{n}` → `categories.id = n`
- `B{n}` → `books.id = n`

### `books/{id}.json` (individual book)
Parsed by the `shamela` npm package (`BookData` type). Contains `pages[]` and `titles[]`.

### `books/en/{id}.json` (book translation, optional)
Same shape as `master_en.json`. Key field: `excerpts[].from` / `excerpts[].to` — page IDs from the Arabic book's `pages[].id`. Used to build `TranslationIndex`.

## Maintenance

### Upgrading Tauri

Tauri requires its NPM package (`@tauri-apps/api`) and Rust core crate (`tauri`) to be on the **same major.minor version**. When you run `bun update`, the NPM side can advance ahead of the Rust lock file and trigger:

```
Error Found version mismatched Tauri packages.
tauri (v2.x.y) : @tauri-apps/api (v2.z.0)
```

**One-command fix:**

```bash
bun run upgrade:tauri
```

This script (`scripts/upgrade-tauri.sh`) will:
1. Upgrade `@tauri-apps/api` and `@tauri-apps/cli` via `bun update`.
2. Read the resolved `@tauri-apps/api` version.
3. Patch `src-tauri/Cargo.toml` with the matching `major.minor` for the `tauri` crate.
4. Run `cargo update`.

> **Note:** `tauri-build` and `tauri-plugin-*` crates have **independent** version lines and do **not** need to match `@tauri-apps/api`.

After running:
```bash
git add package.json bun.lock src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "chore: upgrade tauri to vX.Y"
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Follow the code style — Biome (`bun run lint:fix && bun run format:fix`)
4. Commit with [Conventional Commits](https://www.conventionalcommits.org/)
5. Open a pull request

## License

MIT — see [LICENSE](LICENSE)

## Support

- **Issues**: [github.com/ragaeeb/libaby/issues](https://github.com/ragaeeb/libaby/issues)
- **Repository**: [github.com/ragaeeb/libaby](https://github.com/ragaeeb/libaby)